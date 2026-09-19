import type { Review } from '@prisma/client';
import { BaseService } from '../../../core/base/BaseService.js';
import type { IReviewService } from '../interfaces/IReviewService.js';
import type { IReviewRepository } from '../interfaces/IReviewRepository.js';
import type { IBookingRepository } from '../../bookings/interfaces/IBookingRepository.js';
import type { IWorkerRepository } from '../../workers/interfaces/IWorkerRepository.js';
import { BookingStatus } from '@prisma/client';
import { NotFoundException, BusinessException } from '../../../core/exceptions/index.js';

export class ReviewService extends BaseService implements IReviewService {
  constructor(
    private readonly reviewRepo: IReviewRepository,
    private readonly bookingRepo: IBookingRepository,
    private readonly workerRepo: IWorkerRepository,
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

    const worker = await this.workerRepo.findById(workerId);
    if (!worker) {
      throw new NotFoundException('WorkerProfile', workerId);
    }

    return await this.reviewRepo.createWithWorkerRatingUpdate({
      bookingId,
      providerId,
      workerId,
      rating: data.rating,
      comment: data.comment ?? null,
    }, workerId);
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
