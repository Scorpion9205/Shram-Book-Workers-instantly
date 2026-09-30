import { BookingStatus } from '@prisma/client';
import type { Booking } from '@prisma/client';
import { BaseService } from '../../../core/base/BaseService.js';
import type { IBookingService } from '../interfaces/IBookingService.js';
import type { IBookingRepository, BookingFilter, CreateBookingInput } from '../interfaces/IBookingRepository.js';
import type { IBookingStateService } from '../interfaces/IBookingStateService.js';
import type { IEventPublisher } from '../../../core/interfaces/IEventPublisher.js';
import type { PaginatedResult } from '../../../core/base/BaseRepository.js';
import { RoutingKeys } from '../../../infrastructure/queue/queue.constants.js';
import { NotFoundException, BusinessException } from '../../../core/exceptions/index.js';

export class BookingService extends BaseService implements IBookingService {
  constructor(
    private readonly bookingRepo: IBookingRepository,
    private readonly stateService: IBookingStateService,
    private readonly eventPublisher: IEventPublisher,
  ) {
    super('BookingService');
  }

  async getBookingById(id: string): Promise<Booking> {
    const booking = await this.bookingRepo.findById(id);
    if (!booking) {
      throw new NotFoundException('Booking', id);
    }
    return booking;
  }

  async getBookings(
    filter: BookingFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Booking>> {
    return await this.bookingRepo.findManyByFilter(filter, page, limit);
  }

  async createBooking(input: CreateBookingInput): Promise<Booking> {
    this.log('Creating new booking', { providerId: input.providerId, type: input.type });
    const booking = await this.bookingRepo.create(input);
    await this.eventPublisher.publish(RoutingKeys.BOOKING_CREATED, booking);
    return booking;
  }

  async cancelBooking(bookingId: string, userId: string, reason?: string): Promise<Booking> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking', bookingId);
    }

    this.log(`Cancelling booking ${bookingId}`, { userId, reason });

    const toStatus = userId === booking.providerId
      ? BookingStatus.CANCELLED_BY_PROVIDER
      : BookingStatus.CANCELLED_BY_WORKER;

    return await this.stateService.transition(bookingId, toStatus, {
      changedBy: userId,
      reason: reason || 'Cancellation requested by user',
    });
  }

  async workerEnRoute(id: string, userId: string): Promise<Booking> {
    const booking = await this.getBookingById(id) as any;
    this.log('Worker is en route for booking', { bookingId: id, workerUserId: userId });

    // Validate that the user is the assigned worker
    if (booking.worker?.userId !== userId) {
      throw new BusinessException('UNAUTHORIZED_WORKER', 'You are not assigned to this booking');
    }

    return await this.stateService.transition(id, BookingStatus.WORKER_EN_ROUTE, {
      changedBy: userId,
      reason: 'Worker is on the way',
    });
  }

  async verifyStartOtp(id: string, userId: string, code: string): Promise<Booking> {
    const booking = await this.getBookingById(id) as any;
    this.log('Verifying start OTP for booking', { bookingId: id, workerUserId: userId });

    // Validate that the user is the assigned worker
    if (booking.worker?.userId !== userId) {
      throw new BusinessException('UNAUTHORIZED_WORKER', 'You are not assigned to this booking');
    }

    if (!booking.startOtp) {
      throw new BusinessException('OTP_INVALID', 'No active start OTP found for this booking');
    }

    if (booking.startOtp !== code) {
      throw new BusinessException('OTP_INVALID', 'Invalid work-start OTP code');
    }

    // Verify transitions sequential FSM path: WORKER_EN_ROUTE -> OTP_VERIFIED -> WORK_STARTED
    await this.stateService.transition(id, BookingStatus.OTP_VERIFIED, {
      changedBy: userId,
      reason: 'Start OTP verified successfully',
    });

    const updated = await this.stateService.transition(id, BookingStatus.WORK_STARTED, {
      changedBy: userId,
      reason: 'Work started',
    });

    // Clear start OTP to prevent replay
    await this.bookingRepo.update(id, { startOtp: null });

    return updated;
  }

  async completeBooking(id: string, userId: string): Promise<Booking> {
    const booking = await this.getBookingById(id) as any;
    this.log('Worker is completing booking', { bookingId: id, workerUserId: userId });

    // Validate that the user is the assigned worker
    if (booking.worker?.userId !== userId) {
      throw new BusinessException('UNAUTHORIZED_WORKER', 'You are not assigned to this booking');
    }

    return await this.stateService.transition(id, BookingStatus.WORK_COMPLETED, {
      changedBy: userId,
      reason: 'Worker completed the work',
    });
  }

  async settlePayment(id: string, userId: string): Promise<Booking> {
    const booking = await this.getBookingById(id);
    this.log('Provider is settling payment', { bookingId: id, providerUserId: userId });

    // Validate that the user is the provider of the booking
    if (booking.providerId !== userId) {
      throw new BusinessException('UNAUTHORIZED_PROVIDER', 'You are not the provider of this booking');
    }

    await this.stateService.transition(id, BookingStatus.PAYMENT_SETTLED, {
      changedBy: userId,
      reason: 'Provider confirmed and settled payment',
    });

    // Persist the final settled amount — previously left null forever, breaking any
    // invoice/payout-reconciliation consumer that reads finalFare.
    return await this.bookingRepo.update(id, { finalFare: booking.amount });
  }

  async settleOfflinePayment(id: string, userId: string): Promise<Booking> {
    const booking = await this.getBookingById(id) as any;
    this.log('Worker is confirming offline payment', { bookingId: id, workerUserId: userId });

    // Validate that the caller is the assigned worker
    if (booking.worker?.userId !== userId) {
      throw new BusinessException('UNAUTHORIZED_WORKER', 'You are not assigned to this booking');
    }

    if (booking.paymentMode !== 'OFFLINE') {
      throw new BusinessException('INVALID_PAYMENT_MODE', 'This booking does not support offline payment');
    }

    await this.stateService.transition(id, BookingStatus.PAYMENT_SETTLED, {
      changedBy: userId,
      reason: 'Worker confirmed offline payment receipt',
    });

    // Persist the final settled amount — previously left null forever, breaking any
    // invoice/payout-reconciliation consumer that reads finalFare.
    return await this.bookingRepo.update(id, { finalFare: booking.amount });
  }
}
