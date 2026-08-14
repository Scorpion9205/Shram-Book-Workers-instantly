import type { Review, Prisma } from '@prisma/client';

export interface IReviewRepository {
  create(data: Prisma.ReviewUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<Review>;
  findByBookingId(bookingId: string, tx?: Prisma.TransactionClient): Promise<Review | null>;
  getWorkerRatingData(workerId: string, tx?: Prisma.TransactionClient): Promise<any>;
  findManyByProviderId(providerId: string, tx?: Prisma.TransactionClient): Promise<any[]>;
}
