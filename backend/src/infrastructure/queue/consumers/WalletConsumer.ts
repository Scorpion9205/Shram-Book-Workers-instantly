import type * as amqp from 'amqplib';
import type { IWalletService } from '../../../modules/wallet/interfaces/IWalletService.js';
import type { IBookingRepository } from '../../../modules/bookings/interfaces/IBookingRepository.js';
import { BookingStatus } from '@prisma/client';
import { Logger } from '../../../core/logger/Logger.js';

export class WalletConsumer {
  private readonly logger = new Logger('WalletConsumer');

  constructor(
    private readonly channel: amqp.Channel,
    private readonly walletService: IWalletService,
    private readonly bookingRepo: IBookingRepository,
  ) {}

  async start(): Promise<void> {
    this.logger.info('Starting Wallet Queue Consumer...');
    this.channel.prefetch(10);

    await this.channel.consume('analytics.queue', async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());
        await this.handleEvent(payload._meta.routingKey, payload);
        this.channel.ack(msg);
      } catch (error) {
        this.logger.error('Wallet consumer error during processing', error);
        this.channel.nack(msg, false, false);
      }
    });
  }

  private async handleEvent(routingKey: string, payload: any): Promise<void> {
    if (routingKey === 'booking.status_changed' && payload.toStatus === BookingStatus.PAYMENT_SETTLED) {
      const bookingId = payload.bookingId;
      this.logger.info(`Processing wallet payout for payment settled booking ${bookingId}`);

      const booking = await this.bookingRepo.findById(bookingId);
      if (!booking) {
        this.logger.error(`Booking not found for wallet payout: ${bookingId}`);
        return;
      }

      const workerId = booking.workerId;
      if (!workerId) {
        this.logger.warn(`No worker assigned to booking ${bookingId} for payout`);
        return;
      }

      const amount = Number(booking.amount);
      const commissionPercent = 15;
      const creditAmount = Number((amount * (1 - commissionPercent / 100)).toFixed(2));

      await this.walletService.creditWallet(workerId, creditAmount, 'BOOKING_PAYMENT', bookingId);
      this.logger.info(`Successfully credited worker wallet for booking ${bookingId}`, {
        workerId,
        amount: creditAmount,
      });
    }
  }
}
