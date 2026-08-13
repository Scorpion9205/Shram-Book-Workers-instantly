import { Booking, BookingStatus, Prisma } from '@prisma/client';
import { BaseRepository, PaginatedResult } from '../../../core/base/BaseRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { DatabaseException } from '../../../core/exceptions/index.js';
import type { IBookingRepository, BookingFilter, CreateBookingInput } from '../interfaces/IBookingRepository.js';

export class BookingRepository extends BaseRepository<Booking> implements IBookingRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

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

    const whereClause: Prisma.BookingWhereInput = {
      deletedAt: null,
      ...(filter.providerId && { providerId: filter.providerId }),
      ...(filter.workerId && { workerId: filter.workerId }),
      ...(filter.agentId && { agentId: filter.agentId }),
      ...(filter.status && { status: filter.status }),
      ...(filter.jobId && { jobId: filter.jobId }),
    };

    try {
      const [items, total] = await Promise.all([
        client.booking.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            provider: { select: { id: true, name: true, profileImage: true } },
            worker: { include: { user: { select: { name: true, profileImage: true } } } },
            job: { select: { title: true, skillId: true } },
          },
        }),
        client.booking.count({ where: whereClause }),
      ]);

      return this.buildPaginatedResult(items, total, page, limit);
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
          status: data.status || BookingStatus.CREATED,
          type: data.type as any,
          address: data.address ?? null,
        },
      });
    } catch (err) {
      throw new DatabaseException('Failed to instantiate new booking record', err);
    }
  }
}
