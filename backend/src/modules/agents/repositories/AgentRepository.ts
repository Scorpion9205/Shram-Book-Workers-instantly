import { PaymentStatus } from '@prisma/client';
import type { AgentProfile } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type { IAgentRepository, CommissionableBooking } from '../interfaces/IAgentRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';

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
    const bookings = await this.prisma.client.booking.findMany({
      where: { agentId, payment: { status: PaymentStatus.COMPLETED } },
      select: { id: true, amount: true, finalFare: true, completedAt: true },
      orderBy: { completedAt: 'desc' },
    });

    return bookings.map((b) => ({
      id: b.id,
      amount: Number(b.amount),
      finalFare: b.finalFare !== null ? Number(b.finalFare) : null,
      completedAt: b.completedAt,
    }));
  }
}
