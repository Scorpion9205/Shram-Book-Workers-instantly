import { apiSlice } from "@/services/api/apiSlice";

export interface WorkerBankDetails {
  accountHolderName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  bankName: string | null;
}

export interface AgentWorkerRosterEntry {
  id: string;
  workerId: string;
  verifiedByAgent: boolean;
  createdAt: string;
  worker: {
    id: string;
    userId: string;
    isAvailable: boolean;
    dailyRate: number | null;
    latitude: number | null;
    longitude: number | null;
    user: { id: string; name: string; phone: string | null; isActive: boolean };
    skills: { skillId: string; skill: { id: string; name: string } }[];
    bankDetails: WorkerBankDetails;
  };
}

export interface WorkerEarningBooking {
  id: string;
  amount: number;
  finalFare: number | null;
  completedAt: string | null;
  payoutPaidAt: string | null;
  payoutMethod: string | null;
  // True once admin has paid the agent the money for this booking.
  fundsReleased: boolean;
}

export interface WorkerEarningsSummary {
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  // Pending money the agent already holds and can hand to the worker right now.
  payableNow: number;
  bookings: WorkerEarningBooking[];
}

export interface CreateManagedWorkerPayload {
  name: string;
  phone?: string | null;
  skillIds: string[];
  dailyRate?: number | null;
  latitude?: number;
  longitude?: number;
}

interface AgentDataResponse<T> {
  success: boolean;
  data: T;
}

export const agentWorkerApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMyWorkers: builder.query<AgentWorkerRosterEntry[], void>({
      query: () => "/agents/workers",
      transformResponse: (response: AgentDataResponse<AgentWorkerRosterEntry[]>) => response.data,
      providesTags: ["AgentWorker"],
    }),
    createManagedWorker: builder.mutation<AgentWorkerRosterEntry, CreateManagedWorkerPayload>({
      query: (body) => ({ url: "/agents/workers", method: "POST", body }),
      transformResponse: (response: AgentDataResponse<AgentWorkerRosterEntry>) => response.data,
      invalidatesTags: ["AgentWorker", "AgentDashboard"],
    }),
    setWorkerAvailability: builder.mutation<
      void,
      { workerId: string; isAvailable: boolean; latitude?: number; longitude?: number }
    >({
      query: ({ workerId, ...body }) => ({
        url: `/agents/workers/${workerId}/availability`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["AgentWorker", "AgentDashboard"],
    }),
    setWorkerVerified: builder.mutation<AgentWorkerRosterEntry, { workerId: string; verified: boolean }>({
      query: ({ workerId, verified }) => ({
        url: `/agents/workers/${workerId}/verify`,
        method: "PATCH",
        body: { verified },
      }),
      transformResponse: (response: AgentDataResponse<AgentWorkerRosterEntry>) => response.data,
      invalidatesTags: ["AgentWorker"],
    }),
    removeWorker: builder.mutation<void, string>({
      query: (workerId) => ({ url: `/agents/workers/${workerId}`, method: "DELETE" }),
      invalidatesTags: ["AgentWorker", "AgentDashboard"],
    }),
    getWorkerEarnings: builder.query<WorkerEarningsSummary, string>({
      query: (workerId) => `/agents/workers/${workerId}/earnings`,
      transformResponse: (response: AgentDataResponse<WorkerEarningsSummary>) => response.data,
      providesTags: (result, error, workerId) => [{ type: "AgentWorker" as const, id: workerId }],
    }),
    setWorkerBankDetails: builder.mutation<
      AgentWorkerRosterEntry,
      { workerId: string; accountHolderName: string; accountNumber: string; ifscCode: string; bankName: string }
    >({
      query: ({ workerId, ...body }) => ({
        url: `/agents/workers/${workerId}/bank-details`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response: AgentDataResponse<AgentWorkerRosterEntry>) => response.data,
      invalidatesTags: ["AgentWorker"],
    }),
    payoutWorker: builder.mutation<void, { workerId: string; method: "CASH" | "BANK_TRANSFER" }>({
      query: ({ workerId, method }) => ({
        url: `/agents/workers/${workerId}/payout`,
        method: "POST",
        body: { method },
      }),
      invalidatesTags: (result, error, { workerId }) => [{ type: "AgentWorker" as const, id: workerId }, "AgentWorker"],
    }),
  }),
});

export const {
  useGetMyWorkersQuery,
  useCreateManagedWorkerMutation,
  useSetWorkerAvailabilityMutation,
  useSetWorkerVerifiedMutation,
  useRemoveWorkerMutation,
  useGetWorkerEarningsQuery,
  useSetWorkerBankDetailsMutation,
  usePayoutWorkerMutation,
} = agentWorkerApi;
