import type { Review } from '@prisma/client';
import { BaseService } from '../../../core/base/BaseService.js';
import type { IReviewService } from '../interfaces/IReviewService.js';
import type { IReviewRepository } from '../interfaces/IReviewRepository.js';
import type { IBookingRepository } from '../../bookings/interfaces/IBookingRepository.js';
import type { IWorkerRepository } from '../../workers/interfaces/IWorkerRepository.js';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { NotFoundException, BusinessException } from '../../../core/exceptions/index.js';

export class ReviewService extends BaseService implements IReviewService {
  constructor(
    private readonly reviewRepo: IReviewRepository,
    private readonly bookingRepo: IBookingRepository,
    private readonly workerRepo: IWorkerRepository,
    private readonly prisma: PrismaService,
  ) {
    super('ReviewService');
  }

  async createReview(bookingId: string, providerId: string, data: any): Promise<Review> {
    this.log('Creating review for booking', { bookingId, providerId, rating: data.rating });

    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking', bookingId);
    }

    if (booking.providerId !== providerId) {
      throw new BusinessException('UNAUTHORIZED_REVIEW', 'Unauthorized to review this booking');
    }

    if (booking.status !== BookingStatus.WORK_COMPLETED && booking.status !== BookingStatus.PAYMENT_SETTLED) {
      throw new BusinessException('BOOKING_NOT_COMPLETED', 'Booking is not completed');
    }

    const existingReview = await this.reviewRepo.findByBookingId(bookingId);
    if (existingReview) {
      throw new BusinessException('REVIEW_ALREADY_EXISTS', 'Review already exists');
    }

    const workerId = booking.workerId;
    if (!workerId) {
      throw new BusinessException('WORKER_NOT_ASSIGNED', 'Worker not assigned to this booking');
    }

    return await this.prisma.client.$transaction(async (tx) => {
      const review = await this.reviewRepo.create({
        bookingId,
        providerId,
        workerId,
        rating: data.rating,
        comment: data.comment ?? null,
      }, tx);

      const worker = await this.workerRepo.findById(workerId, tx);
      if (!worker) {
        throw new NotFoundException('WorkerProfile', workerId);
      }

      const newRating =
        (worker.rating * worker.totalReviews + data.rating) /
        (worker.totalReviews + 1);

      await this.workerRepo.updateProfile(worker.userId, {
        dailyRate: worker.dailyRate as any, // Keep existing rate
        experience: worker.experience,
      }, tx);

      // Explicitly update totalReviews and rating on workerProfile
      await tx.workerProfile.update({
        where: { id: workerId },
        data: {
          rating: Number(newRating.toFixed(2)),
          totalReviews: {
            increment: 1,
          },
        },
      });

      return review;
    });
  }

  async getWorkerRating(workerId: string): Promise<any> {
    this.log('Retrieving rating info for worker', { workerId });
    const workerRating = await this.reviewRepo.getWorkerRatingData(workerId);
    if (!workerRating) {
      throw new NotFoundException('WorkerProfile', workerId);
    }
    return workerRating;
  }

  async getWorkerReviews(workerId: string): Promise<any> {
    this.log('Retrieving reviews for worker', { workerId });
    const workerRating = await this.reviewRepo.getWorkerRatingData(workerId);
    if (!workerRating) {
      throw new NotFoundException('WorkerProfile', workerId);
    }
    return workerRating;
  }

  async getProviderReviews(providerId: string): Promise<any[]> {
    this.log('Retrieving reviews submitted by provider', { providerId });
    return this.reviewRepo.findManyByProviderId(providerId);
  }
}
