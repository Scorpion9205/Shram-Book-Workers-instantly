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
}
