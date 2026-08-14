import type { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import type { IBookingService } from '../interfaces/IBookingService.js';
import type { IReviewService } from '../../reviews/interfaces/IReviewService.js';
import { BookingPolicy } from '../policies/BookingPolicy.js';
import { BookingMapper } from '../mappers/Booking.mapper.js';
import { CreateBookingSchema } from '../dto/CreateBooking.dto.js';
import { CancelBookingSchema } from '../dto/CancelBooking.dto.js';
import { FilterBookingsSchema } from '../dto/FilterBookings.dto.js';
import { AuthorizationException, BusinessException } from '../../../core/exceptions/index.js';
import { Prisma } from '@prisma/client';

export class BookingController extends BaseController {
  constructor(
    private readonly bookingService: IBookingService,
    private readonly reviewService: IReviewService,
  ) {
    super();
  }

  getBookingById = async (req: Request, res: Response): Promise<void> => {
    const bookingId = req.params.id as string;
    const user = (req as any).user;

    const booking = await this.bookingService.getBookingById(bookingId);

    // Apply authorization policy check
    if (!BookingPolicy.canView(booking, user)) {
      throw new AuthorizationException('You are not authorized to view this booking');
    }

    this.ok(res, BookingMapper.toResponse(booking), 'Booking details retrieved successfully');
  };

  getBookings = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const dto = this.validate(FilterBookingsSchema, {
      ...req.query,
      // Default filter scope based on role if not Admin
      ...(user.role === 'PROVIDER' && { providerId: user.id }),
      ...(user.role === 'WORKER' && { workerId: user.id }),
      ...(user.role === 'AGENT' && { agentId: user.id }),
    });

    const result = await this.bookingService.getBookings(dto, dto.page, dto.limit);

    this.paginated(
      res,
      BookingMapper.toResponseList(result.items),
      result.total,
      result.page,
      result.limit,
      'Bookings retrieved successfully',
    );
  };

  createBooking = async (req: Request, res: Response): Promise<void> => {
    const dto = this.validate(CreateBookingSchema, req.body);

    const booking = await this.bookingService.createBooking({
      jobId: dto.jobId,
      providerId: dto.providerId,
      workerId: dto.workerId,
      agentId: dto.agentId,
      amount: new Prisma.Decimal(dto.amount),
      estimatedFare: new Prisma.Decimal(dto.estimatedFare),
      type: dto.type,
      address: dto.address,
    });

    this.created(res, BookingMapper.toResponse(booking), 'Booking created successfully');
  };

  cancelBooking = async (req: Request, res: Response): Promise<void> => {
    const bookingId = req.params.id as string;
    const user = (req as any).user;
    const dto = this.validate(CancelBookingSchema, req.body);

    const booking = await this.bookingService.getBookingById(bookingId);

    // Apply policy check
    if (!BookingPolicy.canCancel(booking, user)) {
      throw new AuthorizationException('You do not have permission to cancel this booking at this stage');
    }

    const updated = await this.bookingService.cancelBooking(bookingId, user.id, dto.reason);

    this.ok(res, BookingMapper.toResponse(updated), 'Booking successfully cancelled');
  };

  workerEnRoute = async (req: Request, res: Response): Promise<void> => {
    const bookingId = req.params.id as string;
    const user = (req as any).user;
    const booking = await this.bookingService.workerEnRoute(bookingId, user.userId);
    this.ok(res, BookingMapper.toResponse(booking), 'Worker marked en-route successfully');
  };

  verifyStartOtp = async (req: Request, res: Response): Promise<void> => {
    const bookingId = req.params.id as string;
    const user = (req as any).user;
    const { code } = req.body;
    if (!code) {
      throw new BusinessException('OTP_REQUIRED', 'OTP code is required');
    }
    const booking = await this.bookingService.verifyStartOtp(bookingId, user.userId, code);
    this.ok(res, BookingMapper.toResponse(booking), 'Work-start OTP verified and work started successfully');
  };

  completeBooking = async (req: Request, res: Response): Promise<void> => {
    const bookingId = req.params.id as string;
    const user = (req as any).user;
    const booking = await this.bookingService.completeBooking(bookingId, user.userId);
    this.ok(res, BookingMapper.toResponse(booking), 'Booking marked as completed successfully');
  };

  submitReview = async (req: Request, res: Response): Promise<void> => {
    const bookingId = req.params.id as string;
    const user = (req as any).user;
    const { rating, comment } = req.body;
    if (rating === undefined || rating === null) {
      throw new BusinessException('RATING_REQUIRED', 'Rating is required');
    }
    const review = await this.reviewService.createReview(bookingId, user.userId, { rating, comment });
    this.created(res, review, 'Review submitted successfully');
  };
}
