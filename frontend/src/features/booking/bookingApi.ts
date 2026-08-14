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
      transformResponse: (response: BookingsResponse) =>
        response.bookings,
      providesTags: (result) =>
        result
          ? [...result.map((b) => ({ type: "Booking" as const, id: b.id })), "Booking"]
          : ["Booking"],
    }),
    getWorkerBookings: builder.query<Booking[], void>({
      query: () => "/bookings/worker",
      transformResponse: (response: BookingsResponse) =>
        response.bookings,
      providesTags: (result) =>
        result
          ? [...result.map((b) => ({ type: "Booking" as const, id: b.id })), "Booking"]
          : ["Booking"],
    }),
    getBookingById: builder.query<Booking, string>({
      query: (bookingId) => `/bookings/${bookingId}`,
      transformResponse: (response: BookingResponse) =>
        response.booking,
      providesTags: (result, error, bookingId) => [{ type: "Booking", id: bookingId }],
    }),
    workerEnRoute: builder.mutation<Booking, string>({
      query: (bookingId) => ({
        url: `/bookings/${bookingId}/worker-en-route`,
        method: "PATCH",
      }),
      transformResponse: (response: BookingResponse) =>
        response.booking,
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
      transformResponse: (response: BookingResponse) =>
        response.booking,
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
      transformResponse: (response: BookingResponse) =>
        response.booking,
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
  useSubmitReviewMutation,
} = bookingApi;
