import type { Booking, BookingStatus } from '@prisma/client';
import type { PaginatedResult } from '../../../core/base/BaseRepository.js';
import type { BookingFilter } from './IBookingRepository.js';

export interface CreateBookingRequest {
  jobId: string;
  workerId?: string | undefined;
  agentId?: string | undefined;
  type: string;
  address?: unknown;
}

export interface IBookingService {
  getBookingById(id: string): Promise<Booking>;
  getBookings(filter: BookingFilter, page: number, limit: number): Promise<PaginatedResult<Booking>>;
  createBooking(providerId: string, input: CreateBookingRequest): Promise<Booking>;
  cancelBooking(bookingId: string, userId: string, reason?: string): Promise<Booking>;
  workerEnRoute(id: string, userId: string): Promise<Booking>;
  verifyStartOtp(id: string, userId: string, code: string): Promise<Booking>;
  completeBooking(id: string, userId: string): Promise<Booking>;
  settlePayment(id: string, userId: string): Promise<Booking>;
  settleOfflinePayment(id: string, userId: string): Promise<Booking>;
}
