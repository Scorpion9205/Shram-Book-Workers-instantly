import { BookingStatus } from '@prisma/client';
import type { AgentProfile } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { IAgentRepository, CommissionableBooking, WorkerEarningsSummary } from '../interfaces/IAgentRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';

const SETTLED_STATUSES = [BookingStatus.PAYMENT_SETTLED, BookingStatus.REVIEWED, BookingStatus.CLOSED];

export class AgentRepository extends BaseRepository<AgentProfile> implements IAgentRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByUserId(userId: string): Promise<AgentProfile | null> {
    return this.prisma.client.agentProfile.findUnique({
      where: { userId },
    });
  }

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

  async findCommissionableBookings(agentId: string): Promise<CommissionableBooking[]> {
    // OFFLINE-mode bookings never get a Payment row at all (settleOfflinePayment only
    // transitions the booking's own status) — filtering on the `payment` relation silently
    // excluded every offline-settled booking from an Agent's commission summary. The booking's
    // own status is the correct signal: PAYMENT_SETTLED (and anything reached after it) means
    // money has genuinely changed hands, for both ONLINE and OFFLINE bookings alike.
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
