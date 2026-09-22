import { apiSlice } from "@/services/api/apiSlice";
import type { Booking } from "@/types";

interface BookingsResponse {
  success: boolean;
  bookings: Booking[];
}

interface BookingResponse {
  success: boolean;
  booking: Booking;
}

export const bookingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProviderBookings: builder.query<Booking[], void>({
      query: () => "/bookings/provider",
      transformResponse: (response: any) =>
        response.data?.bookings || response.bookings || response.data || response,
      providesTags: (result) =>
        result
          ? [...result.map((b) => ({ type: "Booking" as const, id: b.id })), "Booking"]
          : ["Booking"],
    }),
    getWorkerBookings: builder.query<Booking[], void>({
      query: () => "/bookings/worker",
      transformResponse: (response: any) =>
        response.data?.bookings || response.bookings || response.data || response,
      providesTags: (result) =>
        result
          ? [...result.map((b) => ({ type: "Booking" as const, id: b.id })), "Booking"]
          : ["Booking"],
    }),
    getBookingById: builder.query<Booking, string>({
      query: (bookingId) => `/bookings/${bookingId}`,
      transformResponse: (response: any) =>
        response.data?.booking || response.booking || response.data || response,
      providesTags: (result, error, bookingId) => [{ type: "Booking", id: bookingId }],
    }),
    workerEnRoute: builder.mutation<Booking, string>({
      query: (bookingId) => ({
        url: `/bookings/${bookingId}/worker-en-route`,
        method: "PATCH",
      }),
      transformResponse: (response: any) =>
        response.data?.booking || response.booking || response.data || response,
      async onQueryStarted(bookingId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          bookingApi.util.updateQueryData("getBookingById", bookingId, (draft) => {
            draft.status = "WORKER_EN_ROUTE";
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (result, error, bookingId) => [
        { type: "Booking", id: bookingId },
        "DashboardWorker",
        "DashboardProvider",
      ],
    }),
    verifyStartOtp: builder.mutation<Booking, { bookingId: string; code: string }>({
      query: ({ bookingId, code }) => ({
        url: `/bookings/${bookingId}/verify-start-otp`,
        method: "POST",
        body: { code },
      }),
      transformResponse: (response: any) =>
        response.data?.booking || response.booking || response.data || response,
      async onQueryStarted({ bookingId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          bookingApi.util.updateQueryData("getBookingById", bookingId, (draft) => {
            draft.status = "WORK_STARTED";
            draft.startedAt = new Date().toISOString();
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (result, error, { bookingId }) => [
        { type: "Booking", id: bookingId },
        "DashboardWorker",
        "DashboardProvider",
      ],
    }),
    completeBooking: builder.mutation<Booking, string>({
      query: (bookingId) => ({
        url: `/bookings/${bookingId}/complete`,
        method: "PATCH",
      }),
      transformResponse: (response: any) =>
        response.data?.booking || response.booking || response.data || response,
      async onQueryStarted(bookingId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          bookingApi.util.updateQueryData("getBookingById", bookingId, (draft) => {
            draft.status = "WORK_COMPLETED";
            draft.completedAt = new Date().toISOString();
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (result, error, bookingId) => [
        { type: "Booking", id: bookingId },
        "DashboardWorker",
        "DashboardProvider",
      ],
    }),
    settleBooking: builder.mutation<Booking, string>({
      query: (bookingId) => ({
        url: `/bookings/${bookingId}/settle`,
        method: "PATCH",
      }),
      transformResponse: (response: any) =>
        response.data?.booking || response.booking || response.data || response,
      async onQueryStarted(bookingId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          bookingApi.util.updateQueryData("getBookingById", bookingId, (draft) => {
            draft.status = "PAYMENT_SETTLED";
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (result, error, bookingId) => [
        { type: "Booking", id: bookingId },
        "DashboardWorker",
        "DashboardProvider",
      ],
    }),
    settleOfflineBooking: builder.mutation<Booking, string>({
      query: (bookingId) => ({
        url: `/bookings/${bookingId}/settle-offline`,
        method: "PATCH",
      }),
      transformResponse: (response: any) =>
        response.data?.booking || response.booking || response.data || response,
      async onQueryStarted(bookingId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          bookingApi.util.updateQueryData("getBookingById", bookingId, (draft) => {
            draft.status = "PAYMENT_SETTLED";
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (result, error, bookingId) => [
        { type: "Booking", id: bookingId },
        "DashboardWorker",
        "DashboardProvider",
      ],
    }),
    createPaymentOrder: builder.mutation<any, string>({
      query: (bookingId) => ({
        url: `/payments/orders`,
        method: "POST",
        body: { bookingId },
      }),
      transformResponse: (response: any) =>
        response.data || response,
    }),
    submitReview: builder.mutation<any, { bookingId: string; rating: number; comment?: string }>({
      query: ({ bookingId, rating, comment }) => ({
        url: `/bookings/${bookingId}/review`,
        method: "POST",
        body: { rating, comment },
      }),
      invalidatesTags: (result, error, { bookingId }) => [
        { type: "Booking", id: bookingId },
        "DashboardWorker",
        "DashboardProvider",
      ],
    }),
  }),
});

export const {
  useGetProviderBookingsQuery,
  useGetWorkerBookingsQuery,
  useGetBookingByIdQuery,
  useWorkerEnRouteMutation,
  useVerifyStartOtpMutation,
  useCompleteBookingMutation,
  useSettleBookingMutation,
  useSettleOfflineBookingMutation,
  useCreatePaymentOrderMutation,
  useSubmitReviewMutation,
} = bookingApi;
