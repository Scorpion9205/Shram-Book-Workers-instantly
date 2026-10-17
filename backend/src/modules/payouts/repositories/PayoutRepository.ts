import { randomUUID } from 'node:crypto';
import { BookingStatus } from '@prisma/client';
import type { PayoutRequest, PayoutRequestKind, PayoutRequestStatus } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { BusinessException, ConflictException, NotFoundException } from '../../../core/exceptions/index.js';
import type {
  AgentSettledBooking,
  IPayoutRepository,
  PayoutDetails,
  PayoutRequestWithUser,
  PayoutTotals,
} from '../interfaces/IPayoutRepository.js';

const SETTLED_STATUSES = [BookingStatus.PAYMENT_SETTLED, BookingStatus.REVIEWED, BookingStatus.CLOSED];

const USER_SELECT = { id: true, name: true, email: true, phone: true, role: true } as const;

/**
 * All Prisma access for payout requests. Every method that moves money (wallet debit/refund,
 * locking bookings to a request) does it inside one transaction together with the request row,
 * so a request can never exist without its money being held, or the other way round.
 */
export class PayoutRepository extends BaseRepository<PayoutRequest> implements IPayoutRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createWorkerWithdrawal(userId: string, amount: number, details: PayoutDetails): Promise<PayoutRequest> {
    const requestId = randomUUID();

    return this.prisma.client.$transaction(async (tx) => {
      const worker = await tx.workerProfile.findUnique({ where: { userId } });
      if (!worker) throw new NotFoundException('WorkerProfile', userId);

      const wallet = await tx.wallet.findUnique({ where: { workerId: worker.id } });
      if (!wallet) {
        throw new BusinessException('INSUFFICIENT_BALANCE', 'Your wallet has no balance to withdraw.');
      }

      // Check-and-subtract in one UPDATE so two parallel requests can't both pass the check.
      const debited = await tx.wallet.updateMany({
        where: { id: wallet.id, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      if (debited.count === 0) {
        throw new BusinessException('INSUFFICIENT_BALANCE', 'You do not have enough balance for this withdrawal.');
      }

      await tx.transaction.create({
        data: { walletId: wallet.id, amount, type: 'DEBIT', reference: `WITHDRAWAL:${requestId}` },
      });

      return tx.payoutRequest.create({
        data: { id: requestId, kind: 'WORKER_WALLET', userId, amount, ...details },
      });
    });
  }

  async createAgentRequest(
    kind: 'AGENT_COMMISSION' | 'AGENT_WORKER_FUNDS',
    userId: string,
    amount: number,
    details: PayoutDetails,
    bookingIds: string[],
    dues?: { bookingIds: string[]; amount: number },
  ): Promise<PayoutRequest> {
    const requestId = randomUUID();

    return this.prisma.client.$transaction(async (tx) => {
      const request = await tx.payoutRequest.create({
        data: { id: requestId, kind, userId, amount, duesDeducted: dues?.amount ?? 0, ...details },
      });

      if (dues && dues.bookingIds.length > 0) {
        const settled = await tx.booking.updateMany({
          where: { id: { in: dues.bookingIds }, duesRequestId: null, platformDueSettledAt: null },
          data: { duesRequestId: requestId },
        });
        if (settled.count !== dues.bookingIds.length) {
          throw new ConflictException('Some cash dues were already settled. Please refresh and try again.');
        }
      }

      // Only bookings that are still unclaimed get locked. If a parallel request grabbed some of
      // them first the count is short and the whole thing rolls back.
      const locked = await tx.booking.updateMany({
        where:
          kind === 'AGENT_COMMISSION'
            ? { id: { in: bookingIds }, commissionRequestId: null, commissionCheckedOutAt: null }
            : { id: { in: bookingIds }, workerFundsRequestId: null },
        data: kind === 'AGENT_COMMISSION' ? { commissionRequestId: requestId } : { workerFundsRequestId: requestId },
      });
      if (locked.count !== bookingIds.length) {
        throw new ConflictException('Some of these bookings were already claimed. Please refresh and try again.');
      }

      return request;
    });
  }

  async findAgentSettledBookings(agentId: string): Promise<AgentSettledBooking[]> {
    const bookings = await this.prisma.client.booking.findMany({
      where: { agentId, status: { in: SETTLED_STATUSES } },
      select: {
        id: true,
        workerId: true,
        paymentMode: true,
        workAmount: true,
        agentAmount: true,
        amount: true,
        finalFare: true,
        completedAt: true,
        payoutPaidAt: true,
        workerFundsRequestId: true,
        workerFundsReleasedAt: true,
        commissionRequestId: true,
        commissionCheckedOutAt: true,
        duesRequestId: true,
        platformDueSettledAt: true,
      },
      orderBy: { completedAt: 'asc' },
    });

    return bookings.map((b) => ({
      ...b,
      amount: Number(b.amount),
      finalFare: b.finalFare !== null ? Number(b.finalFare) : null,
      workAmount: b.workAmount !== null ? Number(b.workAmount) : null,
      agentAmount: b.agentAmount !== null ? Number(b.agentAmount) : null,
    }));
  }

  async findById(id: string): Promise<PayoutRequestWithUser | null> {
    return this.prisma.client.payoutRequest.findUnique({
      where: { id },
      include: { user: { select: USER_SELECT } },
    });
  }

  async listByUser(userId: string): Promise<PayoutRequest[]> {
    return this.prisma.client.payoutRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async list(filter: { status?: PayoutRequestStatus; kind?: PayoutRequestKind }): Promise<PayoutRequestWithUser[]> {
    return this.prisma.client.payoutRequest.findMany({
      where: { ...(filter.status && { status: filter.status }), ...(filter.kind && { kind: filter.kind }) },
      include: { user: { select: USER_SELECT } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async markPaid(id: string, adminUserId: string, transactionRef: string): Promise<PayoutRequest | null> {
    return this.prisma.client.$transaction(async (tx) => {
      // Only a PENDING request can be paid, so a double click can't pay twice.
      const updated = await tx.payoutRequest.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'PAID', transactionRef, processedById: adminUserId, processedAt: new Date() },
      });
      if (updated.count === 0) return null;

      const request = await tx.payoutRequest.findUniqueOrThrow({ where: { id } });
      const now = new Date();
      // Whatever cash dues were netted off this payout are now settled.
      await tx.booking.updateMany({ where: { duesRequestId: id }, data: { platformDueSettledAt: now } });
      if (request.kind === 'AGENT_WORKER_FUNDS') {
        // The money is now with the agent, so they may hand each worker their part.
        await tx.booking.updateMany({ where: { workerFundsRequestId: id }, data: { workerFundsReleasedAt: now } });
      } else if (request.kind === 'AGENT_COMMISSION') {
        await tx.booking.updateMany({ where: { commissionRequestId: id }, data: { commissionCheckedOutAt: now } });
      }
      return request;
    });
  }

  async reject(id: string, adminUserId: string, reason: string): Promise<PayoutRequest | null> {
    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.payoutRequest.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'REJECTED', rejectionReason: reason, processedById: adminUserId, processedAt: new Date() },
      });
      if (updated.count === 0) return null;

      const request = await tx.payoutRequest.findUniqueOrThrow({ where: { id } });
      if (request.kind === 'WORKER_WALLET') {
        // Put the held money back in the wallet.
        const worker = await tx.workerProfile.findUnique({ where: { userId: request.userId } });
        const wallet = worker ? await tx.wallet.findUnique({ where: { workerId: worker.id } }) : null;
        if (wallet) {
          await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: request.amount } } });
          await tx.transaction.create({
            data: { walletId: wallet.id, amount: request.amount, type: 'CREDIT', reference: `WITHDRAWAL_REFUND:${id}` },
          });
        }
      } else if (request.kind === 'AGENT_WORKER_FUNDS') {
        await tx.booking.updateMany({ where: { duesRequestId: id }, data: { duesRequestId: null } });
        await tx.booking.updateMany({ where: { workerFundsRequestId: id }, data: { workerFundsRequestId: null } });
      } else {
        await tx.booking.updateMany({ where: { duesRequestId: id }, data: { duesRequestId: null } });
        await tx.booking.updateMany({ where: { commissionRequestId: id }, data: { commissionRequestId: null } });
      }
      return request;
    });
  }

  async totals(): Promise<PayoutTotals[]> {
    const rows = await this.prisma.client.payoutRequest.groupBy({
      by: ['kind', 'status'],
      _count: { _all: true },
      _sum: { amount: true },
    });
    return rows.map((r) => ({
      kind: r.kind,
      status: r.status,
      count: r._count._all,
      amount: Number(r._sum.amount ?? 0),
    }));
  }
}
