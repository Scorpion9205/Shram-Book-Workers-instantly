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
    startBooking: builder.mutation<Booking, { bookingId: string; otp?: string }>({
      query: ({ bookingId, otp }) => ({
        url: `/bookings/${bookingId}/start`,
        method: "PATCH",
        body: { otp },
      }),
      transformResponse: (response: BookingResponse) =>
        response.booking,
      async onQueryStarted({ bookingId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          bookingApi.util.updateQueryData("getBookingById", bookingId, (draft) => {
            draft.status = "IN_PROGRESS";
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
      query: (bookingId) => ({ url: `/bookings/${bookingId}/complete`, method: "PATCH" }),
      transformResponse: (response: BookingResponse) =>
        response.booking,
      async onQueryStarted(bookingId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          bookingApi.util.updateQueryData("getBookingById", bookingId, (draft) => {
            draft.status = "COMPLETED";
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
  }),
});

export const {
  useGetProviderBookingsQuery,
  useGetWorkerBookingsQuery,
  useGetBookingByIdQuery,
  useStartBookingMutation,
  useCompleteBookingMutation,
} = bookingApi;
