import * as amqp from 'amqplib';
import type { IEventPublisher } from '../../core/interfaces/IEventPublisher.js';
import { Logger } from '../../core/logger/Logger.js';
import { ExchangeNames } from './queue.constants.js';

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
      this.channel = await (this.connection as any).createChannel();
      this.channel.on('error', (err) => this.logger.error('RabbitMQ channel error', err));
      this.channel.on('close', () => this.logger.warn('RabbitMQ channel closed'));
      this.logger.info('RabbitMQ Event Publisher channel initialized');
    } catch (err) {
      this.logger.error('Failed to initialize RabbitMQ channel', err);
      throw err;
    }
  }

  async publish(routingKey: string, payload: object): Promise<void> {
    if (!this.channel) {
      const err = new Error('RabbitMQ channel not initialized');
      this.logger.error('Publish failed', err);
      throw err;
    }

    try {
      const message = Buffer.from(JSON.stringify({
        ...payload,
        _meta: {
          publishedAt: new Date().toISOString(),
          routingKey,
        },
      }));

      const sent = this.channel.publish(ExchangeNames.EVENTS, routingKey, message, {
        persistent: true, // survives broker restarts
        contentType: 'application/json',
      });

      if (!sent) {
        this.logger.warn('RabbitMQ channel publish buffer full', { routingKey });
      } else {
        this.logger.debug('Event published successfully', { routingKey });
      }
    } catch (err) {
      this.logger.error(`Failed to publish event to routing key ${routingKey}`, err);
      throw err;
    }
  }
}
