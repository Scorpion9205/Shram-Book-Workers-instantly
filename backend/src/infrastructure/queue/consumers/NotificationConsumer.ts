import type * as amqp from 'amqplib';
import type { INotificationDispatcher } from '../../../modules/notifications/interfaces/INotificationDispatcher.js';
import { NotificationType } from '../../../modules/notifications/enums/NotificationType.js';
import { Logger } from '../../../core/logger/Logger.js';

export class NotificationConsumer {
  private readonly logger = new Logger('NotificationConsumer');

  constructor(
    private readonly channel: amqp.Channel,
    private readonly notificationDispatcher: INotificationDispatcher,
  ) {}

  async start(): Promise<void> {
    this.logger.info('Starting Notification Queue Consumer...');
    this.channel.prefetch(10);

    await this.channel.consume('notification.queue', async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());
        await this.handleEvent(payload._meta.routingKey, payload);
        this.channel.ack(msg);
      } catch (error) {
        this.logger.error('Notification consumer error during processing', error);
        this.channel.nack(msg, false, false); // Sends message to DLX
      }
    });
  }

  private async handleEvent(routingKey: string, payload: any): Promise<void> {
    this.logger.info(`Notification consumer routing event: ${routingKey}`);
    switch (routingKey) {
      case 'booking.status_changed':
        await this.handleBookingStatusChanged(payload);
        break;
      case 'booking.created':
        await this.notificationDispatcher.dispatch({
          type: NotificationType.BOOKING_CREATED,
          userId: payload.providerId,
          data: payload,
        });
        break;
      case 'user.registered':
        await this.notificationDispatcher.dispatch({
          type: NotificationType.WELCOME,
          userId: payload.userId,
          data: payload,
        });
        break;
      default:
        this.logger.warn('Unknown routing key in notification consumer', { routingKey });
    }
  }

  private async handleBookingStatusChanged(payload: any): Promise<void> {
    const typeMap: Partial<Record<string, NotificationType>> = {
      PAYMENT_CONFIRMED: NotificationType.BOOKING_CONFIRMED,
      WORK_STARTED: NotificationType.WORK_STARTED,
      WORK_COMPLETED: NotificationType.WORK_COMPLETED,
      CANCELLED_BY_PROVIDER: NotificationType.BOOKING_CANCELLED,
      CANCELLED_BY_WORKER: NotificationType.BOOKING_CANCELLED,
    };

    const type = typeMap[payload.toStatus];
    if (!type) return;

    await this.notificationDispatcher.dispatch({
      type,
      userId: payload.providerId ?? payload.userId,
      data: payload,
    });
  }
}
