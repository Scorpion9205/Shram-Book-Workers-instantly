import * as amqp from 'amqplib';
import { env } from '../../config/env.js';
import { Logger } from '../../core/logger/Logger.js';
import { ExchangeNames, QueueNames } from '../queue/queue.constants.js';

const logger = new Logger('RabbitMQBootstrap');

/**
 * Connects to RabbitMQ, asserts all required exchanges, queues, dead-letter exchanges,
 * and sets up binding rules. Returns the active connection.
 */
export async function bootstrapRabbitMQ(): Promise<amqp.Connection> {
  try {
    logger.info('Connecting to RabbitMQ...', { url: env.RABBITMQ_URL });
    const connection = await amqp.connect(env.RABBITMQ_URL);
    const channel = await connection.createChannel();

    // 1. Assert Exchanges
    logger.info('Asserting exchanges...');
    await channel.assertExchange(ExchangeNames.EVENTS, 'topic', { durable: true });
    await channel.assertExchange(ExchangeNames.DLX, 'fanout', { durable: true });

    // 2. Assert Queues
    logger.info('Asserting queues...');
    // Notifications queue with dead-letter exchange configuration
    try {
      await channel.deleteQueue(QueueNames.NOTIFICATION);
    } catch (e) {
      // Ignore if queue does not exist
    }

    await channel.assertQueue(QueueNames.NOTIFICATION, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': ExchangeNames.DLX,
      },
    });

    await channel.assertQueue(QueueNames.ANALYTICS, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': ExchangeNames.DLX,
      },
    });

    await channel.assertQueue(QueueNames.CLEANUP, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': ExchangeNames.DLX,
      },
    });

    // Dead-letter queue: catches every message nacked/discarded by the queues above so
    // failures (e.g. a wallet payout that threw mid-processing) are recoverable instead
    // of silently vanishing into a fanout exchange with nothing bound to it.
    await channel.assertQueue(QueueNames.DEAD_LETTER, { durable: true });
    await channel.bindQueue(QueueNames.DEAD_LETTER, ExchangeNames.DLX, '');

    // 3. Bind Queues to Exchange via Routing Keys
    logger.info('Binding queues to exchanges...');
    // Notifications listens to booking events, payments, reviews, and registrations
    await channel.bindQueue(QueueNames.NOTIFICATION, ExchangeNames.EVENTS, 'booking.#');
    await channel.bindQueue(QueueNames.NOTIFICATION, ExchangeNames.EVENTS, 'payment.#');
    await channel.bindQueue(QueueNames.NOTIFICATION, ExchangeNames.EVENTS, 'review.#');
    await channel.bindQueue(QueueNames.NOTIFICATION, ExchangeNames.EVENTS, 'user.registered');

    // Analytics listens to everything
    await channel.bindQueue(QueueNames.ANALYTICS, ExchangeNames.EVENTS, '#');

    // Cleanup listens to instant requests
    await channel.bindQueue(QueueNames.CLEANUP, ExchangeNames.EVENTS, 'instant_request.#');

    await channel.close();
    logger.info('RabbitMQ bootstrap completed successfully');
    return connection as any;
  } catch (err) {
    logger.error('Failed to bootstrap RabbitMQ queues/exchanges', err);
    throw err;
  }
}
