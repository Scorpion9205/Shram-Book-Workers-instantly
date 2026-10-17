import type { PayoutRequest, PayoutRequestKind, PayoutRequestStatus } from '@prisma/client';

export interface PayoutDetails {
  method: 'UPI' | 'BANK';
  upiId?: string | null;
  accountHolderName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  bankName?: string | null;
}

// A settled booking brought in by an agent, with everything needed to work out who is owed what.
export interface AgentSettledBooking {
  id: string;
  workerId: string | null;
  paymentMode: string;
  amount: number;
  finalFare: number | null;
  workAmount: number | null;
  agentAmount: number | null;
  completedAt: Date | null;
  payoutPaidAt: Date | null;
  workerFundsRequestId: string | null;
  workerFundsReleasedAt: Date | null;
  commissionRequestId: string | null;
  commissionCheckedOutAt: Date | null;
  duesRequestId: string | null;
  platformDueSettledAt: Date | null;
}

export type PayoutRequestWithUser = PayoutRequest & {
  user: { id: string; name: string; email: string | null; phone: string | null; role: string };
};

export interface PayoutTotals {
  kind: PayoutRequestKind;
  status: PayoutRequestStatus;
  count: number;
  amount: number;
}

export interface IPayoutRepository {
  /** Takes the money out of the worker's wallet and records the request, in one transaction. */
  createWorkerWithdrawal(userId: string, amount: number, details: PayoutDetails): Promise<PayoutRequest>;
  /** Creates the request and locks the given bookings to it, in one transaction. */
  createAgentRequest(
    kind: 'AGENT_COMMISSION' | 'AGENT_WORKER_FUNDS',
    userId: string,
    amount: number,
    details: PayoutDetails,
    bookingIds: string[],
    // Cash bookings whose platform share is netted off this payout (amount is already net of it).
    dues?: { bookingIds: string[]; amount: number },
  ): Promise<PayoutRequest>;
  findAgentSettledBookings(agentId: string): Promise<AgentSettledBooking[]>;
  findById(id: string): Promise<PayoutRequestWithUser | null>;
  listByUser(userId: string): Promise<PayoutRequest[]>;
  list(filter: { status?: PayoutRequestStatus | undefined; kind?: PayoutRequestKind | undefined }): Promise<PayoutRequestWithUser[]>;
  /** Marks a PENDING request paid. Returns null if it was not pending any more. */
  markPaid(id: string, adminUserId: string, transactionRef: string): Promise<PayoutRequest | null>;
  /** Rejects a PENDING request and gives the money/bookings back. Returns null if it was not pending. */
  reject(id: string, adminUserId: string, reason: string): Promise<PayoutRequest | null>;
  totals(): Promise<PayoutTotals[]>;
}
