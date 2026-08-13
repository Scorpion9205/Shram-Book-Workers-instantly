import { Booking, BookingStatus, Prisma } from '@prisma/client';
import { BaseService } from '../../../core/base/BaseService.js';
import { IBookingService } from '../interfaces/IBookingService.js';
import { IBookingRepository, BookingFilter, CreateBookingInput } from '../interfaces/IBookingRepository.js';
import { IBookingStateService } from '../interfaces/IBookingStateService.js';
import { PaginatedResult } from '../../../core/base/BaseRepository.js';
import { NotFoundException, BusinessException } from '../../../core/exceptions/index.js';

export class BookingService extends BaseService implements IBookingService {
  constructor(
    private readonly bookingRepo: IBookingRepository,
    private readonly stateService: IBookingStateService,
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
    return await this.bookingRepo.create(input);
  }

  async cancelBooking(bookingId: string, userId: string, reason?: string): Promise<Booking> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking', bookingId);
    }

    this.log(`Cancelling booking ${bookingId}`, { userId, reason });

    // Determine cancellation transition path based on who cancels
    const toStatus = userId === booking.providerId
      ? BookingStatus.CANCELLED_BY_PROVIDER
      : BookingStatus.CANCELLED_BY_WORKER;

    // Execute state transition
    return await this.stateService.transition(bookingId, toStatus, {
      changedBy: userId,
      reason: reason || 'Cancellation requested by user',
    });
  }
}
