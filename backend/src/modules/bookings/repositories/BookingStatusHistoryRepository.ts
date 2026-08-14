import { Prisma } from '@prisma/client';
import type { BookingStatusHistory } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { DatabaseException } from '../../../core/exceptions/index.js';
import type { IBookingHistoryRepository, AppendHistoryInput } from '../interfaces/IBookingHistoryRepository.js';

export class BookingStatusHistoryRepository extends BaseRepository<BookingStatusHistory>
  implements IBookingHistoryRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async append(
    data: AppendHistoryInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BookingStatusHistory> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.bookingStatusHistory.create({
        data: {
          bookingId: data.bookingId,
          fromStatus: data.fromStatus,
          toStatus: data.toStatus,
          changedBy: data.changedBy,
          reason: data.reason ?? null,
        },
      });
    } catch (err) {
      throw new DatabaseException('Failed to write FSM transition history audit log', err);
    }
  }

  async findByBookingId(
    bookingId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<BookingStatusHistory[]> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.bookingStatusHistory.findMany({
        where: { bookingId },
        orderBy: { changedAt: 'desc' },
      });
    } catch (err) {
      throw new DatabaseException('Error querying status transition audit logs', err);
    }
  }
}
