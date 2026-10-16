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
      select: { id: true, amount: true, finalFare: true, completedAt: true, commissionCheckedOutAt: true },
      orderBy: { completedAt: 'desc' },
    });

    return bookings.map((b) => ({
      id: b.id,
      amount: Number(b.amount),
      finalFare: b.finalFare !== null ? Number(b.finalFare) : null,
      completedAt: b.completedAt,
      commissionCheckedOutAt: b.commissionCheckedOutAt,
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
        completedAt: true,
        payoutPaidAt: true,
        payoutMethod: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    // A booking is "paid" once the agent has clicked Paid on it (payoutPaidAt is set).
    let totalEarned = 0;
    let totalPaid = 0;

    const mapped = bookings.map((b) => {
      const earned = Number(b.finalFare ?? b.amount);
      totalEarned += earned;
      if (b.payoutPaidAt) totalPaid += earned;

      return {
        id: b.id,
        amount: earned,
        finalFare: b.finalFare !== null ? Number(b.finalFare) : null,
        completedAt: b.completedAt,
        payoutPaidAt: b.payoutPaidAt,
        payoutMethod: b.payoutMethod,
      };
    });

    return {
      totalEarned: Number(totalEarned.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      totalPending: Number((totalEarned - totalPaid).toFixed(2)),
      bookings: mapped,
    };
  }

  // Stamps all of a worker's unpaid settled bookings as paid. Returns how many were updated
  // (0 means nothing was pending). The payoutPaidAt: null condition makes a double-click harmless.
  async markWorkerBookingsPaid(agentId: string, workerId: string, method: 'CASH' | 'BANK_TRANSFER'): Promise<number> {
    const result = await this.prisma.client.booking.updateMany({
      where: {
        agentId,
        workerId,
        status: { in: SETTLED_STATUSES },
        payoutPaidAt: null,
      },
      data: {
        payoutPaidAt: new Date(),
        payoutMethod: method,
      },
    });
    return result.count;
  }

  // Same idea for the agent's own commission: stamps every not-yet-checked-out booking.
  async markCommissionCheckedOut(agentId: string): Promise<number> {
    const result = await this.prisma.client.booking.updateMany({
      where: {
        agentId,
        status: { in: SETTLED_STATUSES },
        commissionCheckedOutAt: null,
      },
      data: {
        commissionCheckedOutAt: new Date(),
      },
    });
    return result.count;
  }
}
