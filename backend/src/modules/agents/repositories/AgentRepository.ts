import { BookingStatus } from '@prisma/client';
import type { AgentProfile } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { IAgentRepository, CommissionableBooking, WorkerEarningsSummary } from '../interfaces/IAgentRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';

// A booking counts as "money has changed hands" once it reaches any of these statuses.
// Commission and worker earnings are only calculated from such bookings.
const SETTLED_STATUSES = [BookingStatus.PAYMENT_SETTLED, BookingStatus.REVIEWED, BookingStatus.CLOSED];

// Prisma queries for agent profiles, plus the earnings/commission/payout bookkeeping.
export class AgentRepository extends BaseRepository<AgentProfile> implements IAgentRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // Find the agency profile belonging to a login user.
  async findByUserId(userId: string): Promise<AgentProfile | null> {
    return this.prisma.client.agentProfile.findUnique({
      where: { userId },
    });
  }

  // Find an agency by its own profile id.
  async findById(id: string): Promise<AgentProfile | null> {
    return this.prisma.client.agentProfile.findUnique({
      where: { id },
    });
  }

  async create(userId: string, data: { agencyName: string; description?: string | null }): Promise<AgentProfile> {
    return this.prisma.client.agentProfile.create({
      data: {
        userId,
        agencyName: data.agencyName,
        description: data.description ?? null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            city: true,
            state: true,
            profileImage: true,
          },
        },
      },
    }) as any;
  }

  async update(userId: string, data: { agencyName?: string; description?: string | null }): Promise<AgentProfile> {
    return this.prisma.client.agentProfile.update({
      where: { userId },
      data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            city: true,
            state: true,
            profileImage: true,
          },
        },
      },
    }) as any;
  }

  // All settled bookings the agency brought in; commission is calculated from these.
  async findCommissionableBookings(agentId: string): Promise<CommissionableBooking[]> {
    // Filter on the booking's own status, not on a Payment row: cash/UPI (OFFLINE) bookings
    // never create a Payment record, so a payment-based filter would silently drop them.
    const bookings = await this.prisma.client.booking.findMany({
      where: {
        agentId,
        status: { in: SETTLED_STATUSES },
      },
      select: {
        id: true,
        amount: true,
        finalFare: true,
        workAmount: true,
        agentAmount: true,
        completedAt: true,
        commissionCheckedOutAt: true,
        commissionRequestId: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    return bookings.map((b) => ({
      id: b.id,
      amount: Number(b.amount),
      finalFare: b.finalFare !== null ? Number(b.finalFare) : null,
      workAmount: b.workAmount !== null ? Number(b.workAmount) : null,
      agentAmount: b.agentAmount !== null ? Number(b.agentAmount) : null,
      completedAt: b.completedAt,
      commissionCheckedOutAt: b.commissionCheckedOutAt,
      commissionRequestId: b.commissionRequestId,
    }));
  }

  // Per-worker ledger: every settled booking, split into already-paid-out and still-pending money.
  async findWorkerEarnings(agentId: string, workerId: string): Promise<WorkerEarningsSummary> {
    const bookings = await this.prisma.client.booking.findMany({
      where: {
        agentId,
        workerId,
        status: { in: SETTLED_STATUSES },
      },
      select: {
        id: true,
        amount: true,
        finalFare: true,
        workAmount: true,
        agentAmount: true,
        completedAt: true,
        payoutPaidAt: true,
        payoutMethod: true,
        workerFundsReleasedAt: true,
        paymentMode: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    // The amounts here are the full booking amounts; AgentService turns them into the worker's
    // share (after platform commission). "Paid" means the agent has clicked Paid (payoutPaidAt).
    const mapped = bookings.map((b) => ({
      id: b.id,
      amount: Number(b.finalFare ?? b.amount),
      finalFare: b.finalFare !== null ? Number(b.finalFare) : null,
      workAmount: b.workAmount !== null ? Number(b.workAmount) : null,
      agentAmount: b.agentAmount !== null ? Number(b.agentAmount) : null,
      completedAt: b.completedAt,
      payoutPaidAt: b.payoutPaidAt,
      payoutMethod: b.payoutMethod,
      // Cash bookings never go through admin, so the agent already holds that money.
      fundsReleased: b.workerFundsReleasedAt !== null || b.paymentMode === 'OFFLINE',
    }));

    return { totalEarned: 0, totalPaid: 0, totalPending: 0, payableNow: 0, bookings: mapped };
  }

  // Stamps a worker's unpaid settled bookings as paid, but only the ones whose money admin has
  // already released to the agent (nothing can be handed over before that). Returns how many were
  // updated (0 means nothing payable). The payoutPaidAt: null condition makes a double-click harmless.
  async markWorkerBookingsPaid(agentId: string, workerId: string, method: 'CASH' | 'BANK_TRANSFER'): Promise<number> {
    const result = await this.prisma.client.booking.updateMany({
      where: {
        agentId,
        workerId,
        status: { in: SETTLED_STATUSES },
        payoutPaidAt: null,
        OR: [{ workerFundsReleasedAt: { not: null } }, { paymentMode: 'OFFLINE' }],
      },
      data: {
        payoutPaidAt: new Date(),
        payoutMethod: method,
      },
    });
    return result.count;
  }
}
