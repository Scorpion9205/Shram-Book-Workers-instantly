import { apiSlice } from "@/services/api/apiSlice";
import type { InstantRequest } from "@/types";

export interface CreateInstantRequestPayload {
  workerType: string;
  address: string;
  amount: number;
  notes?: string;
  workersNeeded: number;
  lat?: number;
  lng?: number;
  title?: string;
  bookingMode: "DIRECT" | "BIDDING";
  quoteId: string;
}

export interface FareCalculationPayload {
  workerType: string;
  workersNeeded?: number;
  lat: number;
  lng: number;
}

export interface FareCalculationResult {
  estimatedFare: number;
  subtotal: number;
  platformFee: number;
  quoteId: string;
}

interface InstantRequestResponse {
  success: boolean;
  request: InstantRequest;
}

interface InstantRequestsResponse {
  success: boolean;
  requests: InstantRequest[];
}

export interface NearbyInstantRequest {
  id: string;
  title: string;
  description?: string | null;
  amount: number;
  address?: string | null;
  distanceKm: number;
  createdAt: string;
  provider?: { name?: string | null };
  items: {
    id: string;
    requiredWorkers: number;
    acceptedWorkers: number;
    skill: { id: string; name: string };
  }[];
}

interface NearbyInstantRequestsResponse {
  success: boolean;
  requests: NearbyInstantRequest[];
}

interface BackendFareResponse {
  success: boolean;
  estimatedFare: number;
  subtotal: number;
  platformFee: number;
  quoteId: string;
}

export const instantRequestApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    createInstantRequest: builder.mutation<InstantRequest, CreateInstantRequestPayload>({
      query: (body) => {
        if (body.lat === undefined || body.lng === undefined) {
          throw new Error("A valid location (latitude/longitude) is required to create an instant request.");
        }
        return {
          url: "/instant-requests",
          method: "POST",
          body: {
            title: body.title ?? "Instant hire request",
            description:
              body.notes ??
              `Offered amount: ${body.amount}`,
            latitude: body.lat,
            longitude: body.lng,
            address: body.address,
            amount: body.amount,
            bookingMode: body.bookingMode,
            quoteId: body.quoteId,
            items: [
              {
                skillId: body.workerType,
                requiredWorkers: body.workersNeeded,
              },
            ],
          },
        };
      },
      transformResponse: (response: any) => {
        const data = response.data || response;
        return data.request || data;
      },
      invalidatesTags: ["InstantRequest", "DashboardProvider", "Booking"],
    }),
    getNearbyInstantRequests: builder.query<NearbyInstantRequest[], void>({
      query: () => "/instant-requests/nearby",
      transformResponse: (response: any) => {
        const data = response.data || response;
        return data.requests || data;
      },
      providesTags: ["InstantRequest"],
    }),
    calculateFare: builder.mutation<FareCalculationResult, FareCalculationPayload>({
      query: (body) => ({
        url: "/instant-requests/calculate-fare",
        method: "POST",
        body: {
          latitude: body.lat,
          longitude: body.lng,
          items: [
            {
              skillId: body.workerType,
              requiredWorkers: body.workersNeeded ?? 1,
            },
          ],
        },
      }),
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          estimatedFare: data.estimatedFare,
          subtotal: data.subtotal,
          platformFee: data.platformFee,
          quoteId: data.quoteId,
        };
      },
    }),
    acceptInstantRequestItem: builder.mutation<{ bookingId: string }, string>({
      query: (itemId) => ({ url: `/instant-requests/items/${itemId}/accept`, method: "POST" }),
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          bookingId: data.bookingId,
        };
      },
      invalidatesTags: ["InstantRequest", "Booking", "DashboardWorker", "DashboardProvider"],
    }),
    getMyInstantRequests: builder.query<InstantRequest[], void>({
      query: () => "/instant-requests/my-requests",
      transformResponse: (response: any) => {
        const data = response.data || response;
        return data.requests || data;
      },
      providesTags: ["InstantRequest"],
    }),
    selectBid: builder.mutation<{ bookingId?: string }, { requestId: string; bidId: string }>({
      query: ({ requestId, bidId }) => ({
        url: `/instant-requests/${requestId}/bids/${bidId}/select`,
        method: "POST",
      }),
      transformResponse: (response: any) => {
        const data = response.data || response;
        return { bookingId: data.bookingId };
      },
      invalidatesTags: ["InstantRequest", "Booking", "DashboardProvider"],
    }),
    cancelInstantRequest: builder.mutation<void, string>({
      query: (requestId) => ({
        url: `/instant-requests/${requestId}/cancel`,
        method: "POST",
      }),
      invalidatesTags: ["InstantRequest", "DashboardProvider"],
    }),
  }),
});

export const {
  useCreateInstantRequestMutation,
  useGetNearbyInstantRequestsQuery,
  useCalculateFareMutation,
  useAcceptInstantRequestItemMutation,
  useGetMyInstantRequestsQuery,
  useSelectBidMutation,
  useCancelInstantRequestMutation,
} = instantRequestApi;