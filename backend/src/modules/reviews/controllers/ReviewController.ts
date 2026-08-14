import type { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import type { IReviewService } from '../interfaces/IReviewService.js';
import { createReviewSchema } from '../validations/review.validation.js';
import { BusinessException } from '../../../core/exceptions/index.js';

export class ReviewController extends BaseController {
  constructor(private readonly reviewService: IReviewService) {
    super();
  }

  createReview = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const bookingId = req.params.bookingId as string;
    if (!bookingId) {
      throw new BusinessException('INVALID_BOOKING_ID', 'Invalid booking id');
    }
    const dto = await this.validate(createReviewSchema, req.body);
    const review = await this.reviewService.createReview(bookingId, user.userId, dto);
    this.created(res, review, 'Review submitted successfully');
  };

  getWorkerRating = async (req: Request, res: Response): Promise<void> => {
    const workerId = req.params.workerId as string;
    if (!workerId) {
      throw new BusinessException('INVALID_WORKER_ID', 'Invalid worker id');
    }
    const ratingInfo = await this.reviewService.getWorkerRating(workerId);
    this.ok(res, ratingInfo, 'Worker rating info retrieved successfully');
  };

  getWorkerReviews = async (req: Request, res: Response): Promise<void> => {
    const workerId = req.params.workerId as string;
    if (!workerId) {
      throw new BusinessException('INVALID_WORKER_ID', 'Invalid worker id');
    }
    const reviews = await this.reviewService.getWorkerReviews(workerId);
    this.ok(res, reviews, 'Worker reviews retrieved successfully');
  };

  getProviderReviews = async (req: Request, res: Response): Promise<void> => {
    const providerId = req.params.providerId as string;
    if (!providerId) {
      throw new BusinessException('INVALID_PROVIDER_ID', 'Invalid provider id');
    }
    const reviews = await this.reviewService.getProviderReviews(providerId);
    this.ok(res, reviews, 'Provider reviews retrieved successfully');
  };
}
