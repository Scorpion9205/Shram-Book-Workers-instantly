import { Booking, BookingStatus, Prisma } from '@prisma/client';
import { PaginatedResult } from '../../../core/base/BaseRepository.js';

export interface BookingFilter {
  providerId?: string;
  workerId?: string;
  agentId?: string;
  status?: BookingStatus;
  jobId?: string;
}

export interface CreateBookingInput {
  jobId?: string;
  providerId: string;
  workerId?: string;
  agentId?: string;
  amount: Prisma.Decimal;
  estimatedFare: Prisma.Decimal;
  status?: BookingStatus;
  type: string; // BookingType
  address?: Prisma.InputJsonValue;
}

export interface IBookingRepository {
  findById(id: string, tx?: Prisma.TransactionClient): Promise<Booking | null>;
  findManyByFilter(
    filter: BookingFilter,
    page: number,
    limit: number,
    tx?: Prisma.TransactionClient,
  ): Promise<PaginatedResult<Booking>>;
  updateStatus(id: string, status: BookingStatus, tx?: Prisma.TransactionClient): Promise<Booking>;
  update(id: string, data: Partial<Booking>, tx?: Prisma.TransactionClient): Promise<Booking>;
  create(data: CreateBookingInput, tx?: Prisma.TransactionClient): Promise<Booking>;
}
