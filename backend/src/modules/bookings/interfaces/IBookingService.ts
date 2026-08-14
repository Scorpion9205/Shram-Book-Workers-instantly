import type { Booking, BookingStatus } from '@prisma/client';
import type { PaginatedResult } from '../../../core/base/BaseRepository.js';
import type { BookingFilter, CreateBookingInput } from './IBookingRepository.js';

export interface IBookingService {
  getBookingById(id: string): Promise<Booking>;
  getBookings(filter: BookingFilter, page: number, limit: number): Promise<PaginatedResult<Booking>>;
  createBooking(input: CreateBookingInput): Promise<Booking>;
  cancelBooking(bookingId: string, userId: string, reason?: string): Promise<Booking>;
}
