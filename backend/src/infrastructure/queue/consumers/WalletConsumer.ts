import type * as amqp from 'amqplib';
import type { IWalletService } from '../../../modules/wallet/interfaces/IWalletService.js';
import type { IBookingRepository } from '../../../modules/bookings/interfaces/IBookingRepository.js';
import type { IBookingStateService } from '../../../modules/bookings/interfaces/IBookingStateService.js';
import type { IPlatformSettingRepository } from '../../../modules/platform-settings/interfaces/IPlatformSettingRepository.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import { BookingStatus } from '@prisma/client';
import { Logger } from '../../../core/logger/Logger.js';
import { CacheKeys } from '../../cache/cacheKeys.js';

const DEFAULT_COMMISSION_PERCENT = 15;

export class WalletConsumer {
  private readonly logger = new Logger('WalletConsumer');

  constructor(
    private readonly channel: amqp.Channel,
    private readonly walletService: IWalletService,
    private readonly bookingRepo: IBookingRepository,
    private readonly bookingStateService: IBookingStateService,
    private readonly platformSettingRepo: IPlatformSettingRepository,
    private readonly cache: ICacheService,
  ) {}

  // Mirrors FareCalculator.applyCommission() exactly — the rate the Provider was actually
  // charged must be the same rate used to compute the Worker's payout, or the platform
  // silently over/under-pays on every settlement (previously hardcoded to 10% here while
  // FareCalculator defaulted to 15%, drifting further whenever an admin changed the setting).
  private async getCommissionPercent(): Promise<number> {
    const cacheKey = CacheKeys.platformSetting('commissionPercent');
    const cached = await this.cache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const setting = await this.platformSettingRepo.get('commissionPercent');
    const percent = setting && setting.value ? Number(setting.value) : DEFAULT_COMMISSION_PERCENT;

    await this.cache.set(cacheKey, percent, 60);
    return percent;
  }

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

        const amount = Number(booking.amount);
        const commissionPercent = await this.getCommissionPercent();

        if (booking.paymentMode === 'ONLINE') {
          // Online payment captured: credit 90% to worker's wallet
          const creditAmount = Number((amount * (1 - commissionPercent / 100)).toFixed(2));
          await this.walletService.creditWallet(workerId, creditAmount, 'BOOKING_PAYMENT', bookingId);
          this.logger.info(`Successfully credited worker wallet for booking ${bookingId}`, {
            workerId,
            amount: creditAmount,
          });
        } else {
          // Offline cash payment: debit 10% commission from worker's wallet (allowNegative = true)
          const debitAmount = Number((amount * (commissionPercent / 100)).toFixed(2));
          await this.walletService.debitWallet(workerId, debitAmount, 'COMMISSION_DEDUCTION', bookingId, true);
          this.logger.info(`Successfully debited commission from worker wallet for offline booking ${bookingId}`, {
            workerId,
            amount: debitAmount,
          });
        }
      }
    }
  }
}
