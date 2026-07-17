import { apiSlice } from "@/services/api/apiSlice";
import type { DashboardProvider, DashboardWorker } from "@/types";

interface DashboardResponse<T> {
  success: boolean;
  dashboard: T;
}

export const dashboardApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getWorkerDashboard: builder.query<DashboardWorker, void>({
      query: () => "/dashboard/worker",
      transformResponse: (response: DashboardResponse<DashboardWorker>) =>
        response.dashboard,
      providesTags: ["DashboardWorker"],
    }),
    getProviderDashboard: builder.query<DashboardProvider, void>({
      query: () => "/dashboard/provider",
      transformResponse: (response: DashboardResponse<DashboardProvider>) =>
        response.dashboard,
      providesTags: ["DashboardProvider"],
    }),
  }),
});

export const { useGetWorkerDashboardQuery, useGetProviderDashboardQuery } = dashboardApi;
