import { apiSlice } from "@/services/api/apiSlice";
import type { AgentProfile, AgentCommissionSummary, Booking, DashboardAgent, JobApplication } from "@/types";

interface AgentDataResponse<T> {
  success: boolean;
  data: T;
}

export interface AgentProfilePayload {
  agencyName: string;
  description?: string;
}

export interface AgentOpenInstantRequestItem {
  id: string;
  requiredWorkers: number;
  acceptedWorkers: number;
  skill: { id: string; name: string };
}

export interface AgentOpenInstantRequest {
  id: string;
  title: string;
  description?: string | null;
  amount: number;
  address?: string | null;
  latitude: number;
  longitude: number;
  createdAt: string;
  provider: { name: string };
  items: AgentOpenInstantRequestItem[];
}

export const agentApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createAgentProfile: builder.mutation<AgentProfile, AgentProfilePayload>({
      query: (body) => ({ url: "/agents/profile", method: "POST", body }),
      transformResponse: (response: AgentDataResponse<AgentProfile>) => response.data,
      invalidatesTags: ["AgentProfile", "AgentDashboard"],
    }),
    getMyAgentProfile: builder.query<AgentProfile, void>({
      query: () => "/agents/me",
      transformResponse: (response: AgentDataResponse<AgentProfile>) => response.data,
      providesTags: ["AgentProfile"],
    }),
    updateMyAgentProfile: builder.mutation<AgentProfile, Partial<AgentProfilePayload>>({
      query: (body) => ({ url: "/agents/me", method: "PATCH", body }),
      transformResponse: (response: AgentDataResponse<AgentProfile>) => response.data,
      invalidatesTags: ["AgentProfile", "AgentDashboard"],
    }),
    getAgentDashboard: builder.query<DashboardAgent, void>({
      query: () => "/agents/dashboard",
      transformResponse: (response: AgentDataResponse<DashboardAgent>) => response.data,
      providesTags: ["AgentDashboard"],
    }),
    getAgentApplications: builder.query<JobApplication[], void>({
      query: () => "/agents/applications",
      transformResponse: (response: AgentDataResponse<JobApplication[]>) => response.data,
      providesTags: ["AgentApplication"],
    }),
    getAgentBookings: builder.query<Booking[], void>({
      query: () => "/agents/bookings",
      transformResponse: (response: AgentDataResponse<Booking[]>) => response.data,
      providesTags: ["AgentBooking"],
    }),
    getAgentCommissions: builder.query<AgentCommissionSummary, void>({
      query: () => "/agents/commissions",
      transformResponse: (response: AgentDataResponse<AgentCommissionSummary>) => response.data,
      providesTags: ["AgentBooking"],
    }),
    assignWorkerToApplication: builder.mutation<
      { success: boolean; bookingId?: string },
      { applicationId: string; workerId: string }
    >({
      query: ({ applicationId, workerId }) => ({
        url: `/agents/applications/${applicationId}/assign-worker`,
        method: "POST",
        body: { workerId },
      }),
      transformResponse: (response: AgentDataResponse<{ success: boolean; bookingId?: string }>) => response.data,
      invalidatesTags: ["AgentApplication", "AgentBooking", "AgentDashboard", "AgentWorker" as any],
    }),
    getOpenInstantRequests: builder.query<AgentOpenInstantRequest[], void>({
      query: () => "/agents/instant-requests/open",
      transformResponse: (response: AgentDataResponse<AgentOpenInstantRequest[]>) => response.data,
      providesTags: ["InstantRequest"],
    }),
    assignWorkerToInstantItem: builder.mutation<
      { bookingId?: string; status?: string },
      { itemId: string; workerId: string }
    >({
      query: ({ itemId, workerId }) => ({
        url: `/agents/instant-requests/items/${itemId}/assign`,
        method: "POST",
        body: { workerId },
      }),
      transformResponse: (response: AgentDataResponse<{ bookingId?: string; status?: string }>) => response.data,
      invalidatesTags: ["InstantRequest", "AgentBooking", "AgentDashboard", "AgentWorker" as any],
    }),
  }),
});

export const {
  useCreateAgentProfileMutation,
  useGetMyAgentProfileQuery,
  useUpdateMyAgentProfileMutation,
  useGetAgentDashboardQuery,
  useGetAgentApplicationsQuery,
  useGetAgentBookingsQuery,
  useGetAgentCommissionsQuery,
  useAssignWorkerToApplicationMutation,
  useGetOpenInstantRequestsQuery,
  useAssignWorkerToInstantItemMutation,
} = agentApi;
