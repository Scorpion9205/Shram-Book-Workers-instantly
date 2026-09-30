import { PaymentStatus as PaymentStatusEnum } from '@prisma/client';
import type { Payment, Prisma, PaymentStatus } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { IPaymentRepository } from '../interfaces/IPaymentRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';

export class PaymentRepository extends BaseRepository<Payment> implements IPaymentRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: Prisma.PaymentUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<Payment> {
    const client = tx || this.prisma.client;
    return client.payment.create({ data });
  }

  async findByBookingId(bookingId: string, tx?: Prisma.TransactionClient): Promise<Payment | null> {
    const client = tx || this.prisma.client;
    return client.payment.findUnique({
      where: { bookingId },
    });
  }

  async findByOrderId(orderId: string, tx?: Prisma.TransactionClient): Promise<Payment | null> {
    const client = tx || this.prisma.client;
    return client.payment.findUnique({
      where: { razorpayOrderId: orderId },
    });
  }

  async updateStatus(
    id: string,
    status: PaymentStatus,
    razorpayPaymentId?: string | null,
    razorpaySignature?: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<Payment> {
    const client = tx || this.prisma.client;
    return client.payment.update({
      where: { id },
      data: {
        status,
        ...(razorpayPaymentId !== undefined && { razorpayPaymentId }),
        ...(razorpaySignature !== undefined && { razorpaySignature }),
      },
    });
  }

  async markCompletedIfPending(
    id: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx || this.prisma.client;
    const result = await client.payment.updateMany({
      where: { id, status: PaymentStatusEnum.PENDING },
      data: {
        status: PaymentStatusEnum.COMPLETED,
        razorpayPaymentId,
        razorpaySignature,
      },
    });
    return result.count;
  }
}
