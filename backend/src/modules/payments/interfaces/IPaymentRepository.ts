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
  /**
   * Atomically marks a payment COMPLETED only if it is still PENDING.
   * Returns the number of rows affected (0 = already processed by a concurrent call).
   */
  markCompletedIfPending(
    id: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;
}
