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

  async createOrder(bookingId: string, providerId: string): Promise<any> {
    this.log('Creating payment order', { bookingId, providerId });

    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking', bookingId);
    }

    if (booking.providerId !== providerId) {
      throw new BusinessException('UNAUTHORIZED_PAYMENT', 'Unauthorized to pay for this booking');
    }

    // PAYMENT_PENDING is allowed too — it just means a previous order was created but the
    // Provider abandoned/closed the Razorpay checkout before paying (or it expired) and is
    // now retrying. Without this, that first attempt permanently bricks the booking: every
    // retry would hit this guard since createOrder() already moved it out of CREATED on
    // attempt one, with no code path anywhere to move it back.
    if (booking.status !== BookingStatus.CREATED && booking.status !== BookingStatus.PAYMENT_PENDING) {
      throw new BusinessException('INVALID_BOOKING_STATUS', `Booking is not awaiting payment. Current: ${booking.status}`);
    }

    let payment = await this.paymentRepo.findByBookingId(bookingId);
    if (payment && payment.status === PaymentStatus.COMPLETED) {
      throw new BusinessException('PAYMENT_ALREADY_COMPLETED', 'Payment has already been completed.');
    }

    const amount = Number(booking.amount);

    const order = await this.paymentProvider.createRazorpayOrder(amount, bookingId);

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

    // Only transition on the FIRST order attempt — CREATED -> PAYMENT_PENDING is a real FSM
    // edge, but PAYMENT_PENDING -> PAYMENT_PENDING (a retry) isn't, and would throw.
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

      // Atomic conditional update: only the delivery that actually flips PENDING -> COMPLETED
      // proceeds to confirm the booking. Any concurrent/retried webhook delivery for the same
      // payment sees affectedCount === 0 and is treated as a no-op duplicate.
      const affectedCount = await this.paymentRepo.markCompletedIfPending(payment.id, paymentId, paySignature);

      if (affectedCount === 0) {
        this.log('Payment already processed (duplicate/retried webhook delivery)', {
          paymentId: payment.id,
          status: payment.status,
        });
        return;
      }

      await this.bookingStateService.transition(payment.bookingId, BookingStatus.PAYMENT_CONFIRMED, {
        changedBy: 'RAZORPAY_WEBHOOK',
        reason: 'Payment captured via Razorpay webhook',
      });

      this.log('Payment completed and booking confirmed via webhook', { bookingId: payment.bookingId });
    }
  }
}
