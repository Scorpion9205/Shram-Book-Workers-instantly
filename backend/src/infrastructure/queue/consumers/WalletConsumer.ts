import type * as amqp from 'amqplib';
import type { IWalletService } from '../../../modules/wallet/interfaces/IWalletService.js';
import type { IBookingRepository } from '../../../modules/bookings/interfaces/IBookingRepository.js';
import type { IBookingStateService } from '../../../modules/bookings/interfaces/IBookingStateService.js';
import { BookingStatus } from '@prisma/client';
import { Logger } from '../../../core/logger/Logger.js';
import { splitSettledBooking } from '../../../shared/pricing/bookingPricing.js';

export class WalletConsumer {
  private readonly logger = new Logger('WalletConsumer');

  constructor(
    private readonly channel: amqp.Channel,
    private readonly walletService: IWalletService,
    private readonly bookingRepo: IBookingRepository,
    private readonly bookingStateService: IBookingStateService,
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
    if (routingKey === 'booking.status_changed') {
      if (payload.toStatus === BookingStatus.WORK_COMPLETED) {
        const bookingId = payload.bookingId;
        this.logger.info(`Work completed event caught. Checking payment mode for booking ${bookingId}`);
        const booking = await this.bookingRepo.findById(bookingId);
        if (booking && booking.paymentMode === 'ONLINE') {
          this.logger.info(`Online booking. Auto-settling payment for booking ${bookingId}`);
          await this.bookingStateService.transition(bookingId, BookingStatus.PAYMENT_SETTLED, {
            changedBy: 'SYSTEM',
            reason: 'Auto-settled upon completion (Online Booking)',
          });
          // This auto-settle path bypasses BookingService.settlePayment() entirely, which is
          // the only other place that persists finalFare — without this, finalFare stayed null
          // forever for every ONLINE booking (auto-settle fires almost immediately after
          // WORK_COMPLETED, before a Provider could ever reach settlePayment manually), breaking
          // AgentService's commission/payout reconciliation that reads it.
          await this.bookingRepo.update(bookingId, { finalFare: booking.amount });
        } else {
          this.logger.info(`Offline booking. Awaiting manual payment settlement for booking ${bookingId}`);
        }
      } else if (payload.toStatus === BookingStatus.PAYMENT_SETTLED) {
        const bookingId = payload.bookingId;
        this.logger.info(`Processing wallet payout/deduction for payment settled booking ${bookingId}`);

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

        if (booking.agentId) {
          // Agent-managed worker — they have no login to ever see or withdraw from a wallet,
          // so this booking never touches one. The Agent settles what's owed manually instead
          // (see AgentService.payoutWorker / Booking.payoutPaidAt), set directly on the booking.
          this.logger.info(`Booking ${bookingId} is agent-managed — skipping wallet, payout is tracked manually`, { agentId: booking.agentId });
          return;
        }

        // The split was frozen on the booking when it was created: the worker earns their whole
        // work charge, and the rest of what the provider paid is the platform's.
        const split = splitSettledBooking(
          {
            amount: Number(booking.amount),
            finalFare: booking.finalFare !== null ? Number(booking.finalFare) : null,
            workAmount: booking.workAmount !== null ? Number(booking.workAmount) : null,
            agentAmount: booking.agentAmount !== null ? Number(booking.agentAmount) : null,
          },
          false,
        );

        if (booking.paymentMode === 'ONLINE') {
          // The platform collected the money online, so the worker's earnings go into the wallet.
          await this.walletService.creditWallet(workerId, split.worker, 'BOOKING_PAYMENT', bookingId);
          this.logger.info(`Successfully credited worker wallet for booking ${bookingId}`, {
            workerId,
            amount: split.worker,
          });
        } else {
          // Cash: the worker kept everything, so the platform's part is taken off the wallet
          // (allowNegative = true, so it is recorded even if the balance is short).
          await this.walletService.debitWallet(workerId, split.platform, 'COMMISSION_DEDUCTION', bookingId, true);
          this.logger.info(`Successfully debited platform share from worker wallet for offline booking ${bookingId}`, {
            workerId,
            amount: split.platform,
          });
        }
      }
    }
  }
}
