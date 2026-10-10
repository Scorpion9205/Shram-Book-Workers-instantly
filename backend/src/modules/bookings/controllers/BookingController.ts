import type { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import type { IBookingService } from '../interfaces/IBookingService.js';
import type { IReviewService } from '../../reviews/interfaces/IReviewService.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import { BookingPolicy } from '../policies/BookingPolicy.js';
import { BookingMapper } from '../mappers/Booking.mapper.js';
import { CreateBookingSchema } from '../dto/CreateBooking.dto.js';
import { CancelBookingSchema } from '../dto/CancelBooking.dto.js';
import { FilterBookingsSchema } from '../dto/FilterBookings.dto.js';
import { AuthorizationException, BusinessException } from '../../../core/exceptions/index.js';
import { bookingStartOtpCacheKey } from '../../../shared/utils/booking-otp.util.js';

export class BookingController extends BaseController {
  constructor(
    private readonly bookingService: IBookingService,
    private readonly reviewService: IReviewService,
    private readonly cache: ICacheService,
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

    const response = BookingMapper.toResponse(booking, user);

    // The Provider (only) may see the work-start OTP plaintext, read from the short-lived
    // cache entry written at booking creation — never from the DB, which only holds the hash.
    const isProvider = user && (user.id === booking.providerId || user.userId === booking.providerId);
    if (isProvider) {
      const plainOtp = await this.cache.get<string>(bookingStartOtpCacheKey(bookingId));
      if (plainOtp) {
        (response as any).startOtp = plainOtp;
      }
    }

    this.ok(res, response, 'Booking details retrieved successfully');
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
      BookingMapper.toResponseList(result.items, user),
      result.total,
      result.page,
      result.limit,
      'Bookings retrieved successfully',
    );
  };

  createBooking = async (req: Request, res: Response): Promise<void> => {
    const dto = this.validate(CreateBookingSchema, req.body);
    const user = (req as any).user;

    const booking = await this.bookingService.createBooking(user.userId, {
      jobId: dto.jobId,
      workerId: dto.workerId,
      agentId: dto.agentId,
      type: dto.type,
      address: dto.address,
    });

    this.created(res, BookingMapper.toResponse(booking, user), 'Booking created successfully');
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
    this.ok(res, BookingMapper.toResponse(booking, user), 'Worker marked en-route successfully');
  };

  verifyStartOtp = async (req: Request, res: Response): Promise<void> => {
    const bookingId = req.params.id as string;
    const user = (req as any).user;
    const { code } = req.body;
    if (!code) {
      throw new BusinessException('OTP_REQUIRED', 'OTP code is required');
    }
    const booking = await this.bookingService.verifyStartOtp(bookingId, user.userId, code);
    this.ok(res, BookingMapper.toResponse(booking, user), 'Work-start OTP verified and work started successfully');
  };

  completeBooking = async (req: Request, res: Response): Promise<void> => {
    const bookingId = req.params.id as string;
    const user = (req as any).user;
    const booking = await this.bookingService.completeBooking(bookingId, user.userId);
    this.ok(res, BookingMapper.toResponse(booking, user), 'Booking marked as completed successfully');
  };

  settleBooking = async (req: Request, res: Response): Promise<void> => {
    const bookingId = req.params.id as string;
    const user = (req as any).user;
    const booking = await this.bookingService.settlePayment(bookingId, user.userId);
    this.ok(res, BookingMapper.toResponse(booking, user), 'Payment settled successfully');
  };

  settleOfflineBooking = async (req: Request, res: Response): Promise<void> => {
    const bookingId = req.params.id as string;
    const user = (req as any).user;
    const booking = await this.bookingService.settleOfflinePayment(bookingId, user.userId);
    this.ok(res, BookingMapper.toResponse(booking, user), 'Offline payment settled successfully');
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
