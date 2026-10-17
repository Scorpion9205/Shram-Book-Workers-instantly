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

  // After the work is finished the worker (or their agent) shows a QR of a Razorpay Payment Link,
  // and the provider pays by scanning it - like a cab or delivery app. The link is for the exact
  // booking amount. Asking again while it is still unpaid shows the same link.
  async createCompletionPayment(bookingId: string, userId: string): Promise<{ linkId: string; url: string; amount: number }> {
    this.log('Creating completion payment link', { bookingId, userId });

    const booking = await this.bookingRepo.findById(bookingId) as any;
    if (!booking) {
      throw new NotFoundException('Booking', bookingId);
    }

    // Only the worker on the booking, or the agent managing that worker, may ask for the QR.
    let allowed = booking.worker?.userId === userId;
    if (!allowed && booking.agentId) {
      const agent = await this.prisma.client.agentProfile.findUnique({ where: { userId }, select: { id: true } });
      allowed = agent?.id === booking.agentId;
    }
    if (!allowed) {
      throw new BusinessException('UNAUTHORIZED_WORKER', 'You are not assigned to this booking');
    }

    if (booking.status !== BookingStatus.WORK_COMPLETED) {
      throw new BusinessException('INVALID_BOOKING_STATUS', `Payment is available once the work is completed. Current: ${booking.status}`);
    }

    const amount = Number(booking.amount);
    const payment = await this.paymentRepo.findByBookingId(bookingId);
    if (payment && payment.status === PaymentStatus.COMPLETED) {
      throw new BusinessException('PAYMENT_ALREADY_COMPLETED', 'Payment has already been completed.');
    }

    // Reuse a link we already made if the provider hasn't paid it yet and it's still open.
    if (payment?.razorpayOrderId?.startsWith('plink_')) {
      const existing = await this.paymentProvider.fetchPaymentLink(payment.razorpayOrderId);
      if (existing.status === 'created') {
        return { linkId: existing.id, url: existing.url, amount };
      }
    }

    const link = await this.paymentProvider.createPaymentLink(amount, bookingId, `SHRAM booking ${bookingId.slice(0, 8).toUpperCase()}`);

    // The link's id is stored in razorpayOrderId (link payments have no order of ours); the
    // webhook finds the payment by it.
    if (payment) {
      await this.prisma.client.payment.update({
        where: { id: payment.id },
        data: { razorpayOrderId: link.id, status: PaymentStatus.PENDING },
      });
    } else {
      await this.paymentRepo.create({ bookingId, amount, status: PaymentStatus.PENDING, razorpayOrderId: link.id });
    }

    return { linkId: link.id, url: link.url, amount };
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

    // The provider paid the link (QR) shown after the work was done.
    if (event === 'payment_link.paid') {
      await this.settleFromPaymentLink(payload, signature);
      return;
    }
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

  // A completion payment link got paid: mark the payment done and settle the booking. The money is now
  // with the platform (Razorpay), so the booking is treated as an online payment - that is what
  // makes the worker's wallet get credited the way it does for other online bookings.
  private async settleFromPaymentLink(payload: any, signature: string): Promise<void> {
    const linkId = payload.payload?.payment_link?.entity?.id;
    const paymentEntityId = payload.payload?.payment?.entity?.id;
    if (!linkId || !paymentEntityId) {
      this.log('Payment link webhook payload missing link or payment id');
      return;
    }

    const payment = await this.paymentRepo.findByOrderId(linkId);
    if (!payment) {
      this.log('Payment not found for payment link', { linkId });
      return;
    }

    // Same duplicate-delivery guard as for order payments: only the first call proceeds.
    const affectedCount = await this.paymentRepo.markCompletedIfPending(payment.id, paymentEntityId, signature);
    if (affectedCount === 0) {
      this.log('Link payment already processed (duplicate webhook delivery)', { paymentId: payment.id });
      return;
    }

    try {
      // Switch the mode first so the wallet consumer, reacting to the status change below,
      // sees an online payment.
      await this.bookingRepo.update(payment.bookingId, { paymentMode: 'ONLINE', finalFare: payment.amount } as any);
      await this.bookingStateService.transition(payment.bookingId, BookingStatus.PAYMENT_SETTLED, {
        changedBy: 'RAZORPAY_WEBHOOK',
        reason: 'Provider paid the completion payment link',
      });
      this.log('Link payment completed and booking settled', { bookingId: payment.bookingId });
    } catch (err) {
      // E.g. the worker already marked it as cash-received at the same moment. The provider's
      // money has been captured, so give it back rather than keep a double payment.
      this.logger.warn('Booking could not be settled after payment-link payment - issuing refund', { bookingId: payment.bookingId, err });
      await this.refundForCancelledBooking(payment.bookingId);
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
