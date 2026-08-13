import amqp from 'amqplib';
import { Logger } from '../../../core/logger/Logger.js';
import { QueueNames } from '../queue.constants.js';

/**
 * RabbitMQ consumer for handling notification events.
 * Listens on the notification.queue and triggers SMS/Email/Push dispatches.
 */
export class NotificationConsumer {
  private readonly logger = new Logger('NotificationConsumer');

  constructor(private readonly channel: amqp.Channel) {}

  async start(): Promise<void> {
    try {
      await this.channel.prefetch(10); // Process max 10 messages concurrently

      await this.channel.consume(QueueNames.NOTIFICATION, async (msg) => {
        if (!msg) return;

        try {
          const payload = JSON.parse(msg.content.toString());
          const routingKey = payload._meta?.routingKey;
          this.logger.info(`Received event on ${QueueNames.NOTIFICATION}`, { routingKey });

          // Stub implementation for Phase 1: auto-acknowledge
          this.channel.ack(msg);
        } catch (error) {
          this.logger.error('Error processing notification message', error);
          // Reject and send to DLX (requeue = false)
          this.channel.nack(msg, false, false);
        }
      });

      this.logger.info(`Notification Consumer started listening on ${QueueNames.NOTIFICATION}`);
    } catch (err) {
      this.logger.error('Failed to start Notification Consumer', err);
      throw err;
    }
  }
}
