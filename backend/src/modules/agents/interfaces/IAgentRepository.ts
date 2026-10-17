import type { AgentProfile } from '@prisma/client';

export interface CommissionableBooking {
  id: string;
  amount: number;
  finalFare: number | null;
  workAmount: number | null;
  agentAmount: number | null;
  completedAt: Date | null;
  commissionCheckedOutAt: Date | null;
  commissionRequestId: string | null;
}

export interface WorkerEarningBooking {
  id: string;
  amount: number;
  finalFare: number | null;
  workAmount: number | null;
  agentAmount: number | null;
  completedAt: Date | null;
  payoutPaidAt: Date | null;
  payoutMethod: string | null;
  // True once admin has paid the agent the money for this booking, so the agent can hand it over.
  fundsReleased: boolean;
}

export interface WorkerEarningsSummary {
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  // Pending money the agent already holds (admin paid it to them) and can hand to the worker now.
  payableNow: number;
  bookings: WorkerEarningBooking[];
}

export interface IAgentRepository {
  findByUserId(userId: string): Promise<AgentProfile | null>;
  findById(id: string): Promise<AgentProfile | null>;
  create(userId: string, data: { agencyName: string; description?: string | null }): Promise<AgentProfile>;
  update(userId: string, data: { agencyName?: string; description?: string | null }): Promise<AgentProfile>;
  findCommissionableBookings(agentId: string): Promise<CommissionableBooking[]>;
  findWorkerEarnings(agentId: string, workerId: string): Promise<WorkerEarningsSummary>;
  /** Marks every unpaid settled booking whose money admin has already released to the agent as paid to the worker. Returns the count affected. */
  markWorkerBookingsPaid(agentId: string, workerId: string, method: 'CASH' | 'BANK_TRANSFER'): Promise<number>;
}
