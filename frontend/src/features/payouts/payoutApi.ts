import { apiSlice } from "@/services/api/apiSlice";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export type PayoutKind = "WORKER_WALLET" | "AGENT_COMMISSION" | "AGENT_WORKER_FUNDS";
export type PayoutStatus = "PENDING" | "PAID" | "REJECTED";

export interface PayoutDetails {
  method: "UPI" | "BANK";
  upiId?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
}

export interface PayoutRequest {
  id: string;
  kind: PayoutKind;
  status: PayoutStatus;
  amount: number | string;
  method: "UPI" | "BANK";
  upiId: string | null;
  accountHolderName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  bankName: string | null;
  transactionRef: string | null;
  duesDeducted: number | string;
  rejectionReason: string | null;
  createdAt: string;
  processedAt: string | null;
  // Only on the admin list
  user?: { id: string; name: string; email: string | null; phone: string | null; role: string };
}

export interface WalletTransaction {
  id: string;
  amount: number | string;
  type: "CREDIT" | "DEBIT";
  reference: string;
  createdAt: string;
}

export interface AgentPayoutSummary {
  rates: { fixedFee: number; servicePercent: number; agentPercent: number };
  minimumPayout: number;
  cashDues: { amount: number; bookingCount: number };
  commission: { availableAmount: number; availableBookingCount: number; requestedAmount: number; paidAmount: number };
  workerFunds: {
    availableAmount: number;
    availableBookingCount: number;
    requestedAmount: number;
    releasedAmount: number;
    toDistributeAmount: number;
  };
}

export interface PlatformPayoutSummary {
  rates: { fixedFee: number; servicePercent: number; agentPercent: number };
  pending: { count: number; amount: number };
  paid: { count: number; amount: number };
  byKind: { kind: PayoutKind; pendingCount: number; pendingAmount: number; paidAmount: number }[];
}

export const payoutApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ---- worker wallet ----
    getWalletBalance: builder.query<{ balance: number }, void>({
      query: () => "/wallet/balance",
      transformResponse: (r: Envelope<{ balance: number }>) => r.data,
      providesTags: ["Wallet"],
    }),
    getWalletTransactions: builder.query<WalletTransaction[], void>({
      query: () => "/wallet/transactions",
      transformResponse: (r: Envelope<WalletTransaction[]>) => r.data,
      providesTags: ["Wallet"],
    }),
    requestWorkerWithdrawal: builder.mutation<PayoutRequest, PayoutDetails & { amount: number }>({
      query: (body) => ({ url: "/payouts/worker-withdrawal", method: "POST", body }),
      transformResponse: (r: Envelope<PayoutRequest>) => r.data,
      invalidatesTags: ["Wallet", "Payout"],
    }),

    // ---- agent ----
    getAgentPayoutSummary: builder.query<AgentPayoutSummary, void>({
      query: () => "/payouts/agent/summary",
      transformResponse: (r: Envelope<AgentPayoutSummary>) => r.data,
      providesTags: ["Payout"],
    }),
    requestAgentCommission: builder.mutation<PayoutRequest, PayoutDetails>({
      query: (body) => ({ url: "/payouts/agent/commission", method: "POST", body }),
      transformResponse: (r: Envelope<PayoutRequest>) => r.data,
      invalidatesTags: ["Payout", "AgentBooking"],
    }),
    requestAgentWorkerFunds: builder.mutation<PayoutRequest, PayoutDetails>({
      query: (body) => ({ url: "/payouts/agent/worker-funds", method: "POST", body }),
      transformResponse: (r: Envelope<PayoutRequest>) => r.data,
      invalidatesTags: ["Payout", "AgentBooking", "AgentWorker"],
    }),

    // ---- worker + agent history ----
    getMyPayoutRequests: builder.query<PayoutRequest[], void>({
      query: () => "/payouts/mine",
      transformResponse: (r: Envelope<PayoutRequest[]>) => r.data,
      providesTags: ["Payout"],
    }),

    // ---- admin ----
    listPayoutRequests: builder.query<PayoutRequest[], { status?: PayoutStatus; kind?: PayoutKind }>({
      query: (params) => ({ url: "/payouts/admin", params }),
      transformResponse: (r: Envelope<PayoutRequest[]>) => r.data,
      providesTags: ["Payout"],
    }),
    getPayoutPlatformSummary: builder.query<PlatformPayoutSummary, void>({
      query: () => "/payouts/admin/summary",
      transformResponse: (r: Envelope<PlatformPayoutSummary>) => r.data,
      providesTags: ["Payout"],
    }),
    markPayoutPaid: builder.mutation<PayoutRequest, { id: string; transactionRef: string }>({
      query: ({ id, ...body }) => ({ url: `/payouts/admin/${id}/pay`, method: "POST", body }),
      invalidatesTags: ["Payout"],
    }),
    rejectPayout: builder.mutation<PayoutRequest, { id: string; reason: string }>({
      query: ({ id, ...body }) => ({ url: `/payouts/admin/${id}/reject`, method: "POST", body }),
      invalidatesTags: ["Payout"],
    }),
  }),
});

export const {
  useGetWalletBalanceQuery,
  useGetWalletTransactionsQuery,
  useRequestWorkerWithdrawalMutation,
  useGetAgentPayoutSummaryQuery,
  useRequestAgentCommissionMutation,
  useRequestAgentWorkerFundsMutation,
  useGetMyPayoutRequestsQuery,
  useListPayoutRequestsQuery,
  useGetPayoutPlatformSummaryQuery,
  useMarkPayoutPaidMutation,
  useRejectPayoutMutation,
} = payoutApi;
