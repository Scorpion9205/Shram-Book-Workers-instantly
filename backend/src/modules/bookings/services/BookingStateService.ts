import { Booking, BookingStatus } from '@prisma/client';
import { IBookingStateService, TransitionMeta } from '../interfaces/IBookingStateService.js';
import { IBookingRepository } from '../interfaces/IBookingRepository.js';
import { IBookingHistoryRepository } from '../interfaces/IBookingHistoryRepository.js';
import { IEventPublisher } from '../../../core/interfaces/IEventPublisher.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { VALID_TRANSITIONS } from '../constants/booking-transitions.constants.js';
import { BookingEvents } from '../events/booking.events.js';
import { BusinessException, NotFoundException } from '../../../core/exceptions/index.js';
import { Logger } from '../../../core/logger/Logger.js';

export class BookingStateService implements IBookingStateService {
  private readonly logger = new Logger('BookingStateService');

  constructor(
    private readonly bookingRepo: IBookingRepository,
    private readonly historyRepo: IBookingHistoryRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly prisma: PrismaService,
  ) {}

  async transition(
    bookingId: string,
    toStatus: BookingStatus,
    meta: TransitionMeta,
  ): Promise<Booking> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking', bookingId);
    }

    this.validateTransition(booking.status, toStatus, bookingId);

    this.logger.info(`Transitioning booking ${bookingId} from ${booking.status} to ${toStatus}`, {
      changedBy: meta.changedBy,
      reason: meta.reason,
    });

    const updated = await this.prisma.transaction(async (tx) => {
      // 1. Update Booking Status
      const updatedBooking = await this.bookingRepo.updateStatus(bookingId, toStatus, tx);

      // 2. Log History Audit Trail
      await this.historyRepo.append({
        bookingId,
        fromStatus: booking.status,
        toStatus,
        changedBy: meta.changedBy,
        reason: meta.reason,
      }, tx);

      return updatedBooking;
    });

    // 3. Emit Domain Event (fire-and-forget, log failures)
    this.emitStatusChanged(bookingId, booking.status, toStatus, meta).catch((err) => {
      this.logger.error(`Failed to publish status change event for booking ${bookingId}`, err);
    });

    return updated;
  }

  private validateTransition(from: BookingStatus, to: BookingStatus, bookingId: string): void {
    const allowed = VALID_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BusinessException(
        'INVALID_BOOKING_TRANSITION',
        `Cannot transition booking ${bookingId} from ${from} to ${to}. Allowed transitions: [${allowed.join(', ')}]`,
      );
    }
  }

  private async emitStatusChanged(
    bookingId: string,
    fromStatus: BookingStatus,
    toStatus: BookingStatus,
    meta: TransitionMeta,
  ): Promise<void> {
    await this.eventPublisher.publish(BookingEvents.STATUS_CHANGED, {
      bookingId,
      fromStatus,
      toStatus,
      changedBy: meta.changedBy,
      reason: meta.reason,
      changedAt: new Date().toISOString(),
    });
  }
}
