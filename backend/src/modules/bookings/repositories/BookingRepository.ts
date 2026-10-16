import { BookingStatus, Prisma } from '@prisma/client';
import type { Booking } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { PaginatedResult } from '../../../core/base/BaseRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { DatabaseException } from '../../../core/exceptions/index.js';
import type { IBookingRepository, BookingFilter, CreateBookingInput } from '../interfaces/IBookingRepository.js';

// Prisma queries for bookings. Soft-deleted rows (deletedAt set) are always filtered out.
export class BookingRepository extends BaseRepository<Booking> implements IBookingRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // Full detail view: includes both parties, the job/instant request and the status history.
  async findById(id: string, tx?: Prisma.TransactionClient): Promise<Booking | null> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.booking.findUnique({
        where: { id, deletedAt: null },
        include: {
          provider: {
            select: { id: true, name: true, phone: true, profileImage: true },
          },
          worker: {
            include: { user: { select: { id: true, name: true, phone: true, profileImage: true } } },
          },
          job: true,
          instantRequest: true,
          statusHistory: { orderBy: { changedAt: 'desc' } },
        },
      });
    } catch (err) {
      throw new DatabaseException('Error retrieving booking by ID', err);
    }
  }

  async findManyByFilter(
    filter: BookingFilter,
    page: number,
    limit: number,
    tx?: Prisma.TransactionClient,
  ): Promise<PaginatedResult<Booking>> {
    const client = tx ?? this.prisma.client;
    const skip = this.buildSkip(page, limit);
    const take = this.clampLimit(limit);

    // Callers pass the worker's *user* id (that's what the JWT has), but bookings store the
    // WorkerProfile id, so translate it first.
    let resolvedWorkerId = filter.workerId;
    if (filter.workerId) {
      try {
        const workerProfile = await client.workerProfile.findUnique({
          where: { userId: filter.workerId },
          select: { id: true },
        });
        if (workerProfile) {
          resolvedWorkerId = workerProfile.id;
        }
      } catch (err) {
        // Fallback silently if query fails
      }
    }

    // Only add a condition for the filters that were actually provided.
    const whereClause: Prisma.BookingWhereInput = {
      deletedAt: null,
      ...(filter.providerId && { providerId: filter.providerId }),
      ...(resolvedWorkerId && { workerId: resolvedWorkerId }),
      ...(filter.agentId && { agentId: filter.agentId }),
      ...(filter.status && { status: filter.status }),
      ...(filter.jobId && { jobId: filter.jobId }),
    };

    try {
      const [items, total] = await Promise.all([
        client.booking.findMany({
          where: whereClause,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            provider: { select: { id: true, name: true, profileImage: true } },
            worker: { include: { user: { select: { name: true, profileImage: true } } } },
            job: { select: { title: true, skillId: true } },
          },
        }),
        client.booking.count({ where: whereClause }),
      ]);

      return this.buildPaginatedResult(items, total, page, take);
    } catch (err) {
      throw new DatabaseException('Error querying bookings by filter', err);
    }
  }

  async updateStatus(
    id: string,
    status: BookingStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<Booking> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.booking.update({
        where: { id },
        data: { status },
      });
    } catch (err) {
      throw new DatabaseException('Failed to update booking status', err);
    }
  }

  // Compare-and-swap: only changes the status if it's still `fromStatus`. Returns null when
  // someone else moved it first (Prisma's "record not found" error), so callers can detect the race.
  async updateStatusIfCurrent(
    id: string,
    fromStatus: BookingStatus,
    toStatus: BookingStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<Booking | null> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.booking.update({
        where: { id, status: fromStatus } as Prisma.BookingWhereUniqueInput,
        data: { status: toStatus },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return null;
      }
      throw new DatabaseException('Failed to update booking status', err);
    }
  }

  async update(
    id: string,
    data: any,
    tx?: Prisma.TransactionClient,
  ): Promise<Booking> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.booking.update({
        where: { id },
        data,
      });
    } catch (err) {
      throw new DatabaseException('Failed to update booking details', err);
    }
  }

  // If no status is given, a booking that already has a worker starts as WORKER_ASSIGNED,
  // otherwise it starts as CREATED.
  async create(data: CreateBookingInput, tx?: Prisma.TransactionClient): Promise<Booking> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.booking.create({
        data: {
          jobId: data.jobId ?? null,
          providerId: data.providerId,
          workerId: data.workerId ?? null,
          agentId: data.agentId ?? null,
          amount: data.amount,
          estimatedFare: data.estimatedFare,
          status: data.status || (data.workerId ? BookingStatus.WORKER_ASSIGNED : BookingStatus.CREATED),
          type: data.type as any,
          address: data.address ?? Prisma.DbNull,
        },
      });
    } catch (err) {
      throw new DatabaseException('Failed to instantiate new booking record', err);
    }
  }
}
