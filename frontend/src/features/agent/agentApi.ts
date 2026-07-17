import { apiSlice } from "@/services/api/apiSlice";
import type { AgentProfile, Booking, DashboardAgent, JobApplication } from "@/types";

interface AgentDataResponse<T> {
  success: boolean;
  data: T;
}

export interface AgentProfilePayload {
  agencyName: string;
  description?: string;
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
  }),
});

export const {
  useCreateAgentProfileMutation,
  useGetMyAgentProfileQuery,
  useUpdateMyAgentProfileMutation,
  useGetAgentDashboardQuery,
  useGetAgentApplicationsQuery,
  useGetAgentBookingsQuery,
} = agentApi;
