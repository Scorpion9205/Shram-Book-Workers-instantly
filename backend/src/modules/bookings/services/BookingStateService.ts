import { BookingStatus } from '@prisma/client';
import type { Booking } from '@prisma/client';
import type { IBookingStateService, TransitionMeta } from '../interfaces/IBookingStateService.js';
import type { IBookingRepository } from '../interfaces/IBookingRepository.js';
import type { IBookingHistoryRepository } from '../interfaces/IBookingHistoryRepository.js';
import type { IEventPublisher } from '../../../core/interfaces/IEventPublisher.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { VALID_TRANSITIONS } from '../constants/booking-transitions.constants.js';
import { BookingEvents } from '../events/booking.events.js';
import { BusinessException, NotFoundException } from '../../../core/exceptions/index.js';
import { Logger } from '../../../core/logger/Logger.js';
import { getIO } from '../../../socket/socket.js';
import { BookingMapper } from '../mappers/Booking.mapper.js';

/**
 * The only place allowed to change a booking's status. Each transition is checked against
 * VALID_TRANSITIONS, written together with an audit-history row, then announced over
 * websockets (for live UI updates) and the event queue (for emails, wallet, etc).
 */
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
      // 1. Update Booking Status — conditional on the status we just validated against, so a
      // concurrent transition (read at the same time, also validated, also about to write)
      // can't silently overwrite this one. Only one concurrent caller wins; the other gets
      // null back and must reject rather than corrupt the audit trail with a stale fromStatus.
      const updatedBooking = await this.bookingRepo.updateStatusIfCurrent(bookingId, booking.status, toStatus, tx);

      if (!updatedBooking) {
        throw new BusinessException(
          'BOOKING_STATE_CONFLICT',
          `Booking ${bookingId} status changed concurrently; expected ${booking.status} but it no longer matches. Retry the operation.`,
        );
      }

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

    // Push the change to the browsers of both sides so their screens update without a refresh.
    // Failures here are logged but never block the transition - the DB is already updated.
    try {
      const io = getIO();
      const mappedBooking = BookingMapper.toResponse(updated, { userId: updated.providerId });
      
      const payload = {
        bookingId: updated.id,
        status: toStatus,
      };

      // "bookingStatusUpdated" is the light event - just id + status - used by the booking detail page.
      io.to(`user:${updated.providerId}`).emit('bookingStatusUpdated', payload);
      if (updated.workerId) {
        const workerProfile = await this.prisma.client.workerProfile.findUnique({
          where: { id: updated.workerId },
          select: { userId: true },
        });
        if (workerProfile) {
          io.to(`user:${workerProfile.userId}`).emit('bookingStatusUpdated', payload);
        }
      }

      // "bookingUpdated" carries the whole booking and feeds the global timeline/toast listener.
      io.to(`user:${updated.providerId}`).emit('bookingUpdated', mappedBooking);
      if (updated.workerId) {
        const workerProfile = await this.prisma.client.workerProfile.findUnique({
          where: { id: updated.workerId },
          select: { userId: true },
        });
        if (workerProfile) {
          io.to(`user:${workerProfile.userId}`).emit('bookingUpdated', mappedBooking);
        }
      }
    } catch (err: any) {
      if (err?.message === 'Socket not initialized') {
        this.logger.debug(`Socket.IO not initialized; skipping socket emission for booking ${bookingId}`);
      } else {
        this.logger.error(`Failed to emit socket events for transition of booking ${bookingId}`, err);
      }
    }

    // 3. Emit Domain Event (fire-and-forget, log failures)
    this.emitStatusChanged(bookingId, booking.status, toStatus, meta).catch((err) => {
      this.logger.error(`Failed to publish status change event for booking ${bookingId}`, err);
    });

    return updated;
  }

  // Throws if `to` isn't one of the states we're allowed to reach from `from`.
  private validateTransition(from: BookingStatus, to: BookingStatus, bookingId: string): void {
    const allowed = VALID_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BusinessException(
        'INVALID_BOOKING_TRANSITION',
        `Cannot transition booking ${bookingId} from ${from} to ${to}. Allowed transitions: [${allowed.join(', ')}]`,
      );
    }
  }

  // Publishes "booking status changed" to RabbitMQ; consumers handle notifications and wallet updates.
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
