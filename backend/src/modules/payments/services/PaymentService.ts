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

    if (booking.status !== BookingStatus.CREATED) {
      throw new BusinessException('INVALID_BOOKING_STATUS', `Booking is not in CREATED status. Current: ${booking.status}`);
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

    await this.bookingStateService.transition(bookingId, BookingStatus.PAYMENT_PENDING, {
      changedBy: providerId,
      reason: 'Payment order created on Razorpay',
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment.id,
    };
  }

  async handleWebhook(payload: any, signature: string): Promise<void> {
    this.log('Handling Razorpay webhook callback', { event: payload.event });

    const rawBody = JSON.stringify(payload);
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

      if (payment.status !== PaymentStatus.PENDING) {
        this.log('Payment already processed', { paymentId: payment.id, status: payment.status });
        return;
      }

      const paymentId = entity.id;
      const paySignature = signature;

      await this.paymentRepo.updateStatus(payment.id, PaymentStatus.COMPLETED, paymentId, paySignature);

      await this.bookingStateService.transition(payment.bookingId, BookingStatus.PAYMENT_CONFIRMED, {
        changedBy: 'RAZORPAY_WEBHOOK',
        reason: 'Payment captured via Razorpay webhook',
      });

      this.log('Payment completed and booking confirmed via webhook', { bookingId: payment.bookingId });
    }
  }
}
