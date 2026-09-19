import type { Review, Prisma } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { IReviewRepository } from '../interfaces/IReviewRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';

export class ReviewRepository extends BaseRepository<Review> implements IReviewRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: Prisma.ReviewUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<Review> {
    const client = tx || this.prisma.client;
    return client.review.create({ data });
  }

  async findByBookingId(bookingId: string, tx?: Prisma.TransactionClient): Promise<Review | null> {
    const client = tx || this.prisma.client;
    return client.review.findUnique({
      where: { bookingId },
    });
  }

  async getWorkerRatingData(workerId: string, tx?: Prisma.TransactionClient): Promise<any> {
    const client = tx || this.prisma.client;
    return client.workerProfile.findUnique({
      where: { id: workerId },
      select: {
        id: true,
        rating: true,
        totalReviews: true,
        totalJobs: true,
        reviews: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            provider: {
              select: {
                id: true,
                name: true,
              },
            },
            booking: {
              select: {
                id: true,
                job: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findManyByProviderId(providerId: string, tx?: Prisma.TransactionClient): Promise<any[]> {
    const client = tx || this.prisma.client;
    return client.review.findMany({
      where: { providerId },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        worker: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                profileImage: true,
              },
            },
          },
        },
        booking: {
          select: {
            id: true,
            job: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });
  }

  async createWithWorkerRatingUpdate(
    reviewData: {
      bookingId: string;
      providerId: string;
      workerId: string;
      rating: number;
      comment?: string | null;
    },
    workerId: string,
  ): Promise<Review> {
    return this.prisma.transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          bookingId: reviewData.bookingId,
          providerId: reviewData.providerId,
          workerId: reviewData.workerId,
          rating: reviewData.rating,
          comment: reviewData.comment ?? null,
        },
      });

      const worker = await tx.workerProfile.findUnique({
        where: { id: workerId },
        select: { rating: true, totalReviews: true },
      });

      if (worker) {
        const newRating =
          (Number(worker.rating) * worker.totalReviews + reviewData.rating) /
          (worker.totalReviews + 1);

        await tx.workerProfile.update({
          where: { id: workerId },
          data: {
            rating: Number(newRating.toFixed(2)),
            totalReviews: {
              increment: 1,
            },
          },
        });
      }

      return review;
    });
  }
}
