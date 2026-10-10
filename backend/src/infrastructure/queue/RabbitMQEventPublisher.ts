import * as amqp from 'amqplib';
import type { IEventPublisher } from '../../core/interfaces/IEventPublisher.js';
import { Logger } from '../../core/logger/Logger.js';
import { ExchangeNames } from './queue.constants.js';
import { BusinessException } from '../../core/exceptions/index.js';

const MAX_PUBLISH_ATTEMPTS = 3;
const RETRY_DELAY_MS = [200, 600];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * RabbitMQ implementation of IEventPublisher.
 * Enforces persistent delivery and structured metadata.
 */
export class RabbitMQEventPublisher implements IEventPublisher {
  private readonly logger = new Logger('RabbitMQEventPublisher');
  private channel: amqp.Channel | null = null;

  constructor(private readonly connection: amqp.Connection) {}

  async init(): Promise<void> {
    try {
      const channel = await (this.connection as any).createChannel();
      channel.on('error', (err: any) => this.logger.error('RabbitMQ channel error', err));
      channel.on('close', () => this.logger.warn('RabbitMQ channel closed'));
      this.channel = channel;
      this.logger.info('RabbitMQ Event Publisher channel initialized');
    } catch (err) {
      this.logger.error('Failed to initialize RabbitMQ channel', err);
      throw err;
    }
  }

  // Callers (e.g. BookingStateService.transition) publish fire-and-forget after their own DB
  // work has already committed — a dropped connection or a momentarily-full buffer shouldn't
  // lose a payout-triggering event on the first blip. This is a lightweight mitigation, not a
  // full transactional outbox: a publish that still fails after retries is lost, same as
  // before, just logged loudly (not silently) so it's visible to whoever's watching logs.
  async publish(routingKey: string, payload: object): Promise<void> {
    const message = Buffer.from(JSON.stringify({
      ...payload,
      _meta: {
        publishedAt: new Date().toISOString(),
        routingKey,
      },
    }));

    for (let attempt = 1; attempt <= MAX_PUBLISH_ATTEMPTS; attempt++) {
      try {
        if (!this.channel) {
          throw new BusinessException('QUEUE_NOT_INITIALIZED', 'RabbitMQ channel not initialized');
        }

        const sent = this.channel.publish(ExchangeNames.EVENTS, routingKey, message, {
          persistent: true, // survives broker restarts
          contentType: 'application/json',
        });

        if (!sent) {
          throw new BusinessException('QUEUE_BUFFER_FULL', 'RabbitMQ channel publish buffer full');
        }

        this.logger.debug('Event published successfully', { routingKey, attempt });
        return;
      } catch (err) {
        const isLastAttempt = attempt === MAX_PUBLISH_ATTEMPTS;
        this.logger.error(`Failed to publish event to routing key ${routingKey} (attempt ${attempt}/${MAX_PUBLISH_ATTEMPTS})`, err);
        if (isLastAttempt) {
          throw err;
        }
        await sleep(RETRY_DELAY_MS[attempt - 1] ?? 600);
      }
    }
  }
}
