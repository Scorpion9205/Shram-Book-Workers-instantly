import type { AgentProfile } from '@prisma/client';

export interface CommissionableBooking {
  id: string;
  amount: number;
  finalFare: number | null;
  completedAt: Date | null;
}

export interface IAgentRepository {
  findByUserId(userId: string): Promise<AgentProfile | null>;
  findById(id: string): Promise<AgentProfile | null>;
  create(userId: string, data: { agencyName: string; description?: string | null }): Promise<AgentProfile>;
  update(userId: string, data: { agencyName?: string; description?: string | null }): Promise<AgentProfile>;
  findCommissionableBookings(agentId: string): Promise<CommissionableBooking[]>;
}
