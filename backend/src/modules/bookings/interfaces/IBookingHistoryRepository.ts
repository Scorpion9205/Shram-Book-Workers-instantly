import { BookingStatusHistory, BookingStatus, Prisma } from '@prisma/client';

export interface AppendHistoryInput {
  bookingId: string;
  fromStatus: BookingStatus;
  toStatus: BookingStatus;
  changedBy: string;
  reason?: string | undefined;
}

export interface IBookingHistoryRepository {
  append(data: AppendHistoryInput, tx?: Prisma.TransactionClient): Promise<BookingStatusHistory>;
  findByBookingId(bookingId: string, tx?: Prisma.TransactionClient): Promise<BookingStatusHistory[]>;
}
