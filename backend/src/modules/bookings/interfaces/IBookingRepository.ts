import { BookingStatus } from '@prisma/client';
import type { Booking, Prisma } from '@prisma/client';
import type { PaginatedResult } from '../../../core/base/BaseRepository.js';

export interface BookingFilter {
  providerId?: string | undefined;
  workerId?: string | undefined;
  agentId?: string | undefined;
  status?: BookingStatus | undefined;
  jobId?: string | undefined;
}

export interface CreateBookingInput {
  jobId?: string | undefined;
  providerId: string;
  workerId?: string | undefined;
  agentId?: string | undefined;
  amount: Prisma.Decimal;
  estimatedFare: Prisma.Decimal;
  status?: BookingStatus | undefined;
  type: string; // BookingType
  address?: Prisma.InputJsonValue | undefined;
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
