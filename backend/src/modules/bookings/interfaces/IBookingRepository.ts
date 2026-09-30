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
  /**
   * Atomically updates status only if the booking's current status still matches `fromStatus`.
   * Returns null (instead of throwing) if another writer already changed the status first —
   * callers use this to detect and reject a lost-update race instead of silently overwriting.
   */
  updateStatusIfCurrent(
    id: string,
    fromStatus: BookingStatus,
    toStatus: BookingStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<Booking | null>;
  update(id: string, data: Partial<Booking>, tx?: Prisma.TransactionClient): Promise<Booking>;
  create(data: CreateBookingInput, tx?: Prisma.TransactionClient): Promise<Booking>;
}
