import type { Payment, Prisma, PaymentStatus } from '@prisma/client';

export interface IPaymentRepository {
  create(data: Prisma.PaymentUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<Payment>;
  findByBookingId(bookingId: string, tx?: Prisma.TransactionClient): Promise<Payment | null>;
  findByOrderId(orderId: string, tx?: Prisma.TransactionClient): Promise<Payment | null>;
  updateStatus(
    id: string,
    status: PaymentStatus,
    razorpayPaymentId?: string | null,
    razorpaySignature?: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<Payment>;
}
