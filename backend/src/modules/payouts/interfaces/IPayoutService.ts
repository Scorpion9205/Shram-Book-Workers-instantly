import type { PayoutRequest, PayoutRequestKind, PayoutRequestStatus } from '@prisma/client';
import type { PricingRates } from '../../../shared/pricing/bookingPricing.js';
import type { PayoutDetails, PayoutRequestWithUser } from './IPayoutRepository.js';

export type PayoutRates = PricingRates;

export interface AgentPayoutSummary {
  rates: PayoutRates;
  minimumPayout: number;
  // Cash the agent collected from providers: the platform's share of it is owed to us, and is
  // taken off the agent's next payout automatically.
  cashDues: { amount: number; bookingCount: number };
  // The agent's own cut (agentPercent of each booking they brought in).
  commission: {
    availableAmount: number;
    availableBookingCount: number;
    requestedAmount: number; // already requested, waiting for admin to pay
    paidAmount: number;
  };
  // The workers' share of agent-managed bookings, which admin pays to the agent in one lump.
  workerFunds: {
    availableAmount: number;
    availableBookingCount: number;
    requestedAmount: number;
    releasedAmount: number; // paid to the agent in total, ever
    toDistributeAmount: number; // with the agent, not yet handed to the workers
  };
}

export interface PlatformPayoutSummary {
  rates: PayoutRates;
  pending: { count: number; amount: number };
  paid: { count: number; amount: number };
  byKind: { kind: PayoutRequestKind; pendingCount: number; pendingAmount: number; paidAmount: number }[];
}

export interface IPayoutService {
  getRates(): Promise<PayoutRates>;
  requestWorkerWithdrawal(userId: string, amount: number, details: PayoutDetails): Promise<PayoutRequest>;
  getAgentSummary(agentUserId: string): Promise<AgentPayoutSummary>;
  requestAgentCommission(agentUserId: string, details: PayoutDetails): Promise<PayoutRequest>;
  requestAgentWorkerFunds(agentUserId: string, details: PayoutDetails): Promise<PayoutRequest>;
  listMyRequests(userId: string): Promise<PayoutRequest[]>;
  listRequests(filter: { status?: PayoutRequestStatus | undefined; kind?: PayoutRequestKind | undefined }): Promise<PayoutRequestWithUser[]>;
  getPlatformSummary(): Promise<PlatformPayoutSummary>;
  markPaid(adminUserId: string, requestId: string, transactionRef: string): Promise<PayoutRequest>;
  reject(adminUserId: string, requestId: string, reason: string): Promise<PayoutRequest>;
}
