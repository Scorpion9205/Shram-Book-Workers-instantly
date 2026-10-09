import { apiSlice } from "@/services/api/apiSlice";
import type { User, Booking } from "@/types";

export interface PlatformSetting {
  key: string;
  value: string;
  description?: string;
}

export interface NotificationTemplate {
  type: string;
  channel: string;
  locale: string;
  subject?: string;
  body: string;
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface PlatformAnalytics {
  totalUsers: number;
  totalWorkers: number;
  totalProviders: number;
  totalAgents: number;
  totalBookings: number;
  totalJobs: number;
  activeWorkers: number;
  activeProviders: number;
  totalRevenue: number;
  signupTrend: TrendPoint[];
  bookingTrend: TrendPoint[];
  revenueTrend: TrendPoint[];
}

export const adminApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<{ success: boolean; data: User[]; meta: any }, { page: number; limit: number; search?: string; role?: string }>({
      query: ({ page, limit, search, role }) => {
        let url = `/admin/users?page=${page}&limit=${limit}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (role) url += `&role=${encodeURIComponent(role)}`;
        return { url };
      },
      providesTags: ["User"],
    }),
    suspendUser: builder.mutation<{ success: boolean; message: string }, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({
        url: `/admin/users/${id}/suspend`,
        method: "PUT",
        body: { isActive },
      }),
      invalidatesTags: ["User"],
    }),
    verifyWorker: builder.mutation<{ success: boolean; message: string }, { id: string; isVerified: boolean }>({
      query: ({ id, isVerified }) => ({
        url: `/admin/workers/${id}/verify`,
        method: "PUT",
        body: { isVerified },
      }),
      invalidatesTags: ["User"],
    }),
    getBookings: builder.query<{ success: boolean; data: Booking[]; meta: any }, { page: number; limit: number; status?: string; search?: string }>({
      query: ({ page, limit, status, search }) => {
        let url = `/admin/bookings?page=${page}&limit=${limit}`;
        if (status) url += `&status=${status}`;
        if (search) url += `&search=${search}`;
        return { url };
      },
      providesTags: ["Booking"],
    }),
    assignWorker: builder.mutation<{ success: boolean; message: string }, { id: string; workerId: string }>({
      query: ({ id, workerId }) => ({
        url: `/admin/bookings/${id}/assign-worker`,
        method: "POST",
        body: { workerId },
      }),
      invalidatesTags: ["Booking"],
    }),
    getSettings: builder.query<{ success: boolean; data: PlatformSetting[] }, void>({
      query: () => ({ url: "/admin/settings" }),
      providesTags: ["Settings" as any],
    }),
    updateSetting: builder.mutation<{ success: boolean; message: string }, { key: string; value: string }>({
      query: ({ key, value }) => ({
        url: `/admin/settings/${key}`,
        method: "PUT",
        body: { value },
      }),
      invalidatesTags: ["Settings" as any],
    }),
    getPlatformAnalytics: builder.query<
      { success: boolean; data: PlatformAnalytics },
      { range?: string; startDate?: string; endDate?: string } | void
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.range) queryParams.append("range", params.range);
        if (params?.startDate) queryParams.append("startDate", params.startDate);
        if (params?.endDate) queryParams.append("endDate", params.endDate);
        const queryString = queryParams.toString();
        return { url: `/admin/analytics/dashboard${queryString ? `?${queryString}` : ""}` };
      },
    }),
    getTemplates: builder.query<{ success: boolean; data: NotificationTemplate[] }, void>({
      query: () => ({ url: "/admin/notification-templates" }),
      providesTags: ["Templates" as any],
    }),
    updateTemplate: builder.mutation<{ success: boolean; message: string }, { type: string; channel: string; locale: string; subject?: string; body: string }>({
      query: ({ type, channel, locale, subject, body }) => ({
        url: `/admin/notification-templates/${type}/${channel}/${locale}`,
        method: "PUT",
        body: { subject, body },
      }),
      invalidatesTags: ["Templates" as any],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useSuspendUserMutation,
  useVerifyWorkerMutation,
  useGetBookingsQuery,
  useAssignWorkerMutation,
  useGetSettingsQuery,
  useUpdateSettingMutation,
  useGetPlatformAnalyticsQuery,
  useGetTemplatesQuery,
  useUpdateTemplateMutation,
} = adminApi;
