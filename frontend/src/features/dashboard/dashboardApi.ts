import { apiSlice } from "@/services/api/apiSlice";
import type { DashboardProvider, DashboardWorker } from "@/types";

interface DashboardResponse<T> {
  success: boolean;
  dashboard: T;
}

export const dashboardApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getWorkerDashboard: builder.query<DashboardWorker, { range?: string; startDate?: string; endDate?: string } | void>({
      query: (params) => {
        if (!params) return "/dashboard/worker";
        const { range, startDate, endDate } = params;
        const queryParams = new URLSearchParams();
        if (range) queryParams.append("range", range);
        if (startDate) queryParams.append("startDate", startDate);
        if (endDate) queryParams.append("endDate", endDate);
        const queryString = queryParams.toString();
        return `/dashboard/worker${queryString ? `?${queryString}` : ""}`;
      },
      transformResponse: (response: DashboardResponse<DashboardWorker>) =>
        response.dashboard,
      providesTags: ["DashboardWorker"],
    }),
    getProviderDashboard: builder.query<DashboardProvider, { range?: string; startDate?: string; endDate?: string } | void>({
      query: (params) => {
        if (!params) return "/dashboard/provider";
        const { range, startDate, endDate } = params;
        const queryParams = new URLSearchParams();
        if (range) queryParams.append("range", range);
        if (startDate) queryParams.append("startDate", startDate);
        if (endDate) queryParams.append("endDate", endDate);
        const queryString = queryParams.toString();
        return `/dashboard/provider${queryString ? `?${queryString}` : ""}`;
      },
      transformResponse: (response: DashboardResponse<DashboardProvider>) =>
        response.dashboard,
      providesTags: ["DashboardProvider"],
    }),
  }),
});

export const { useGetWorkerDashboardQuery, useGetProviderDashboardQuery } = dashboardApi;
