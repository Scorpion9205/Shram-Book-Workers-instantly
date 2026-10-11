import type { AgentProfile } from '@prisma/client';

export interface CommissionableBooking {
  id: string;
  amount: number;
  finalFare: number | null;
  completedAt: Date | null;
  commissionCheckedOutAt: Date | null;
}

export interface WorkerEarningBooking {
  id: string;
  amount: number;
  finalFare: number | null;
  completedAt: Date | null;
  payoutPaidAt: Date | null;
  payoutMethod: string | null;
}

export interface WorkerEarningsSummary {
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  bookings: WorkerEarningBooking[];
}

export interface IAgentRepository {
  findByUserId(userId: string): Promise<AgentProfile | null>;
  findById(id: string): Promise<AgentProfile | null>;
  create(userId: string, data: { agencyName: string; description?: string | null }): Promise<AgentProfile>;
  update(userId: string, data: { agencyName?: string; description?: string | null }): Promise<AgentProfile>;
  findCommissionableBookings(agentId: string): Promise<CommissionableBooking[]>;
  findWorkerEarnings(agentId: string, workerId: string): Promise<WorkerEarningsSummary>;
  /** Marks every currently-unpaid settled booking for this worker+agent as paid. Returns the count affected. */
  markWorkerBookingsPaid(agentId: string, workerId: string, method: 'CASH' | 'BANK_TRANSFER'): Promise<number>;
  /** Marks every currently-unclaimed settled booking's commission for this agent as checked out. Returns the count affected. */
  markCommissionCheckedOut(agentId: string): Promise<number>;
}
