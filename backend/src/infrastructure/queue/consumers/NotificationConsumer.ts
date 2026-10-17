import type * as amqp from 'amqplib';
import type { INotificationDispatcher } from '../../../modules/notifications/interfaces/INotificationDispatcher.js';
import type { IBookingRepository } from '../../../modules/bookings/interfaces/IBookingRepository.js';
import { NotificationType } from '../../../modules/notifications/enums/NotificationType.js';
import { Logger } from '../../../core/logger/Logger.js';

// What the email templates need to know about a booking, looked up fresh from the database.
interface BookingEmailDetails {
  providerId: string;
  providerName: string;
  workerName: string;
  amount: number;
  shortId: string;
  // Human-readable time the work is scheduled for (India time); empty if it's "as soon as possible".
  scheduledFor: string;
}

// Which booking status change sends which notification (all go to the provider).
// WORKER_ASSIGNED is the "your worker is confirmed" moment for both online and offline
// bookings; PAYMENT_SETTLED is when the receipt goes out.
const STATUS_TO_NOTIFICATION: Partial<Record<string, NotificationType>> = {
  WORKER_ASSIGNED: NotificationType.BOOKING_CONFIRMED,
  WORK_STARTED: NotificationType.WORK_STARTED,
  WORK_COMPLETED: NotificationType.WORK_COMPLETED,
  PAYMENT_SETTLED: NotificationType.PAYMENT_RECEIPT,
  CANCELLED_BY_PROVIDER: NotificationType.BOOKING_CANCELLED,
  CANCELLED_BY_WORKER: NotificationType.BOOKING_CANCELLED,
};

export class NotificationConsumer {
  private readonly logger = new Logger('NotificationConsumer');

  constructor(
    private readonly channel: amqp.Channel,
    private readonly notificationDispatcher: INotificationDispatcher,
    private readonly bookingRepo: IBookingRepository,
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
        await this.handleBookingCreated(payload);
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

  // The booking.created event carries the raw booking row, which only has ids. Look up the
  // names so the email can greet the provider and name the worker (if one is already assigned).
  private async handleBookingCreated(payload: any): Promise<void> {
    const details = await this.loadBookingDetails(payload.id);
    if (!details) return;

    await this.notificationDispatcher.dispatch({
      type: NotificationType.BOOKING_CREATED,
      userId: details.providerId,
      data: {
        name: details.providerName,
        bookingId: details.shortId,
        workerName: details.workerName,
        scheduledFor: details.scheduledFor,
      },
    });
  }

  // The status-changed event only has the booking id and the old/new status. Everything the
  // email needs (who to send to, names, amount) is loaded from the booking.
  private async handleBookingStatusChanged(payload: any): Promise<void> {
    const type = STATUS_TO_NOTIFICATION[payload.toStatus];
    if (!type) return;

    const details = await this.loadBookingDetails(payload.bookingId);
    if (!details) return;

    await this.notificationDispatcher.dispatch({
      type,
      userId: details.providerId,
      data: {
        providerName: details.providerName,
        workerName: details.workerName,
        bookingShortId: details.shortId,
        amount: details.amount,
        scheduledFor: details.scheduledFor,
        reason: payload.reason,
      },
    });
  }

  private async loadBookingDetails(bookingId: string): Promise<BookingEmailDetails | null> {
    const booking: any = await this.bookingRepo.findById(bookingId);
    if (!booking) {
      this.logger.warn('Booking not found while preparing a notification', { bookingId });
      return null;
    }
    return {
      providerId: booking.providerId,
      providerName: booking.provider?.name ?? '',
      workerName: booking.worker?.user?.name ?? '',
      amount: Number(booking.finalFare ?? booking.amount),
      shortId: String(booking.id).slice(0, 8).toUpperCase(),
      scheduledFor: booking.scheduledAt
        ? new Date(booking.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
        : '',
    };
  }
}
