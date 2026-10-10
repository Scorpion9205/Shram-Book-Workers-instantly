import { BookingStatus } from '@prisma/client';
import type { Booking } from '@prisma/client';
import { BaseService } from '../../../core/base/BaseService.js';
import type { IBookingService, CreateBookingRequest } from '../interfaces/IBookingService.js';
import type { IBookingRepository, BookingFilter } from '../interfaces/IBookingRepository.js';
import type { IBookingStateService } from '../interfaces/IBookingStateService.js';
import type { IJobRepository } from '../../jobs/interfaces/IJobRepository.js';
import type { IEventPublisher } from '../../../core/interfaces/IEventPublisher.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import type { PaginatedResult } from '../../../core/base/BaseRepository.js';
import { RoutingKeys } from '../../../infrastructure/queue/queue.constants.js';
import { NotFoundException, BusinessException } from '../../../core/exceptions/index.js';
import { verifyStartOtpHash, bookingStartOtpCacheKey } from '../../../shared/utils/booking-otp.util.js';

export class BookingService extends BaseService implements IBookingService {
  constructor(
    private readonly bookingRepo: IBookingRepository,
    private readonly stateService: IBookingStateService,
    private readonly eventPublisher: IEventPublisher,
    private readonly cache: ICacheService,
    private readonly jobRepo: IJobRepository,
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

  async createBooking(providerId: string, input: CreateBookingRequest): Promise<Booking> {
    this.log('Creating new booking', { providerId, jobId: input.jobId, type: input.type });

    // The Job is the only source of truth for price here — never trust a client-supplied
    // amount, and never let a caller create a booking under a Job (and thus a Provider
    // identity) they don't own.
    const job = await this.jobRepo.findById(input.jobId);
    if (!job) {
      throw new NotFoundException('Job', input.jobId);
    }
    if (job.providerId !== providerId) {
      throw new BusinessException('UNAUTHORIZED_PROVIDER', 'You do not own this job');
    }
    if (job.budget === null || job.budget === undefined) {
      throw new BusinessException('JOB_HAS_NO_BUDGET', 'This job has no budget set and cannot be booked directly');
    }

    const booking = await this.bookingRepo.create({
      jobId: input.jobId,
      providerId,
      workerId: input.workerId,
      agentId: input.agentId,
      amount: job.budget,
      estimatedFare: job.budget,
      type: input.type,
      address: input.address as any,
    });
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

    const isValid = await verifyStartOtpHash(booking.startOtp, code);
    if (!isValid) {
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

    // Clear start OTP (hash + cached plaintext) to prevent replay
    await this.bookingRepo.update(id, { startOtp: null });
    await this.cache.del(bookingStartOtpCacheKey(id));

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

    // OFFLINE (cash/UPI) bookings are settled by the Worker confirming receipt
    // (settleOfflinePayment), never by the Provider unilaterally — otherwise a Provider could
    // mark the job paid without the Worker ever actually receiving the money.
    if (booking.paymentMode !== 'ONLINE') {
      throw new BusinessException('INVALID_PAYMENT_MODE', 'This booking is not an online payment and cannot be settled this way');
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
