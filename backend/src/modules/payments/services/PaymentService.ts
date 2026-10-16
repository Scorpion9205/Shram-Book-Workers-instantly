import { BaseService } from '../../../core/base/BaseService.js';
import type { IPaymentService } from '../interfaces/IPaymentService.js';
import type { IPaymentRepository } from '../interfaces/IPaymentRepository.js';
import type { IPaymentProvider } from '../interfaces/IPaymentProvider.js';
import type { IBookingRepository } from '../../bookings/interfaces/IBookingRepository.js';
import type { IBookingStateService } from '../../bookings/interfaces/IBookingStateService.js';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { NotFoundException, BusinessException } from '../../../core/exceptions/index.js';
import { env } from '../../../config/env.js';

/**
 * Online (Razorpay) payments for bookings. The flow is:
 *   1. provider asks for an order  -> createOrder()
 *   2. provider pays in the Razorpay checkout popup
 *   3. Razorpay calls our webhook   -> handleWebhook() confirms the booking
 * Cancelled bookings that were already paid get refunded (refundForCancelledBooking).
 */
export class PaymentService extends BaseService implements IPaymentService {
  constructor(
    private readonly paymentRepo: IPaymentRepository,
    private readonly bookingRepo: IBookingRepository,
    private readonly bookingStateService: IBookingStateService,
    private readonly paymentProvider: IPaymentProvider,
    private readonly prisma: PrismaService,
  ) {
    super('PaymentService');
  }

  // Creates a Razorpay order for a booking and returns what the checkout popup needs.
  // Safe to call again if the first attempt was abandoned - it just creates a fresh order.
  async createOrder(bookingId: string, providerId: string): Promise<any> {
    this.log('Creating payment order', { bookingId, providerId });

    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking', bookingId);
    }

    if (booking.providerId !== providerId) {
      throw new BusinessException('UNAUTHORIZED_PAYMENT', 'Unauthorized to pay for this booking');
    }

    // PAYMENT_PENDING is allowed as well: it means an earlier order was created but never paid
    // (checkout closed or expired), and the provider is trying again.
    if (booking.status !== BookingStatus.CREATED && booking.status !== BookingStatus.PAYMENT_PENDING) {
      throw new BusinessException('INVALID_BOOKING_STATUS', `Booking is not awaiting payment. Current: ${booking.status}`);
    }

    // A booking has at most one Payment row. Never charge twice for one that's already paid.
    let payment = await this.paymentRepo.findByBookingId(bookingId);
    if (payment && payment.status === PaymentStatus.COMPLETED) {
      throw new BusinessException('PAYMENT_ALREADY_COMPLETED', 'Payment has already been completed.');
    }

    // The amount comes from the booking in our DB, never from the client.
    const amount = Number(booking.amount);

    const order = await this.paymentProvider.createRazorpayOrder(amount, bookingId);

    // First attempt creates the Payment row; a retry just points it at the new order.
    if (!payment) {
      payment = await this.paymentRepo.create({
        bookingId,
        amount,
        status: PaymentStatus.PENDING,
        razorpayOrderId: order.id,
      });
    } else {
      payment = await this.prisma.client.payment.update({
        where: { id: payment.id },
        data: {
          razorpayOrderId: order.id,
          status: PaymentStatus.PENDING,
        },
      });
    }

    // Only move the status on the first attempt. On a retry the booking is already
    // PAYMENT_PENDING, and PAYMENT_PENDING -> PAYMENT_PENDING isn't a valid transition.
    if (booking.status === BookingStatus.CREATED) {
      await this.bookingStateService.transition(bookingId, BookingStatus.PAYMENT_PENDING, {
        changedBy: providerId,
        reason: 'Payment order created on Razorpay',
      });
    }

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment.id,
    };
  }

  // Razorpay tells us a payment succeeded. We trust it only after verifying the signature
  // (computed over the exact raw body), so nobody else can fake a "paid" call.
  async handleWebhook(rawBody: string, payload: any, signature: string): Promise<void> {
    this.log('Handling Razorpay webhook callback', { event: payload.event });

    const isValid = this.paymentProvider.verifyWebhookSignature(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET!);

    if (!isValid) {
      throw new BusinessException('INVALID_WEBHOOK_SIGNATURE', 'Invalid webhook signature');
    }

    const event = payload.event;
    if (event === 'payment.captured' || event === 'order.paid') {
      const entity = payload.payload.payment?.entity || payload.payload.order?.entity;
      const orderId = entity.order_id || entity.id;

      if (!orderId) {
        this.log('Razorpay webhook payload missing order_id');
        return;
      }

      const payment = await this.paymentRepo.findByOrderId(orderId);
      if (!payment) {
        this.log('Payment not found for order_id', { orderId });
        return;
      }

      const paymentId = entity.id;
      const paySignature = signature;

      // Razorpay may deliver the same webhook more than once. This UPDATE only succeeds for
      // the first delivery (PENDING -> COMPLETED); duplicates change 0 rows and stop here.
      const affectedCount = await this.paymentRepo.markCompletedIfPending(payment.id, paymentId, paySignature);

      if (affectedCount === 0) {
        this.log('Payment already processed (duplicate/retried webhook delivery)', {
          paymentId: payment.id,
          status: payment.status,
        });
        return;
      }

      try {
        await this.bookingStateService.transition(payment.bookingId, BookingStatus.PAYMENT_CONFIRMED, {
          changedBy: 'RAZORPAY_WEBHOOK',
          reason: 'Payment captured via Razorpay webhook',
        });

        // The worker was attached when the booking was created, and nothing else moves it on
        // after payment. Without this step the booking would sit at PAYMENT_CONFIRMED forever
        // and the worker could never head out, start or finish the job.
        await this.bookingStateService.transition(payment.bookingId, BookingStatus.WORKER_ASSIGNED, {
          changedBy: 'RAZORPAY_WEBHOOK',
          reason: 'Worker auto-assigned after payment confirmation',
        });

        this.log('Payment completed and booking confirmed via webhook', { bookingId: payment.bookingId });
      } catch (err) {
        // Most likely the provider cancelled right after paying, before this webhook arrived.
        // The money is already captured, so refund it now instead of leaving a paid payment
        // attached to a cancelled booking.
        this.logger.warn('Booking transition failed after payment capture (likely cancelled mid-flight) — issuing refund', {
          bookingId: payment.bookingId,
          err,
        });
        await this.refundForCancelledBooking(payment.bookingId);
      }
    }
  }

  // Refunds the booking's payment if one was actually captured; does nothing otherwise
  // (never paid, offline booking, or already refunded).
  async refundForCancelledBooking(bookingId: string): Promise<void> {
    const payment = await this.paymentRepo.findByBookingId(bookingId);
    if (!payment || payment.status !== PaymentStatus.COMPLETED || !payment.razorpayPaymentId) {
      return;
    }

    await this.paymentProvider.refundPayment(payment.razorpayPaymentId, Number(payment.amount));

    // Only mark REFUNDED in our DB after Razorpay actually confirms the refund — marking it
    // first and having the API call fail would show the Provider as refunded when they're not.
    await this.paymentRepo.markRefundedIfCompleted(payment.id);

    this.log('Refund issued for cancelled booking', { bookingId, paymentId: payment.id });
  }
}
