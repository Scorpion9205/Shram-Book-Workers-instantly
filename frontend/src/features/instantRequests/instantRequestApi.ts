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
}

export interface FareCalculationPayload {
  workerType: string;
  workersNeeded?: number;
  lat: number;
  lng: number;
}

export interface FareCalculationResult {
  estimatedFare: number;
  minFare: number;
  maxFare: number;
  distanceKm: number;
  estimatedMinutes: number;
}

interface InstantRequestResponse {
  success: boolean;
  request: InstantRequest;
}

interface InstantRequestsResponse {
  success: boolean;
  requests: InstantRequest[];
}

// /instant-requests/nearby actually returns this richer, per-skill-item
// shape (see InstantRequestService.getNearbyRequests on the backend) —
// NOT the flat InstantRequest type used by the create/socket flow.
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
  fare: {
    subtotal: number;
    platformFee: number;
    total: number;
  };
}

export const instantRequestApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createInstantRequest: builder.mutation<InstantRequest, CreateInstantRequestPayload>({
      query: (body) => ({
        url: "/instant-requests",
        method: "POST",
        body: {
          title: body.title ?? "Instant hire request",
          description:
            body.notes ??
            `Offered amount: ${body.amount}`,
          latitude: body.lat ?? 28.6139,
          longitude: body.lng ?? 77.209,
          address: body.address,
          amount: body.amount,
          items: [
            {
              skillId: body.workerType,
              requiredWorkers: body.workersNeeded,
            },
          ],
        },
      }),
      transformResponse: (response: InstantRequestResponse) =>
        response.request,
      invalidatesTags: ["InstantRequest", "DashboardProvider"],
    }),
    getNearbyInstantRequests: builder.query<NearbyInstantRequest[], void>({
      query: () => "/instant-requests/nearby",
      transformResponse: (response: NearbyInstantRequestsResponse) =>
        response.requests,
      providesTags: ["InstantRequest"],
    }),
    calculateFare: builder.mutation<FareCalculationResult, FareCalculationPayload>({
      query: (body) => ({
        url: "/instant-requests/calculate-fare",
        method: "POST",
        body: {
          items: [
            {
              skillId: body.workerType,
              requiredWorkers: body.workersNeeded ?? 1,
            },
          ],
        },
      }),
      transformResponse: (response: BackendFareResponse) => ({
        estimatedFare: response.fare.total,
        minFare: response.fare.subtotal,
        maxFare: response.fare.total,
        distanceKm: 0,
        estimatedMinutes: 0,
      }),
    }),
    acceptInstantRequestItem: builder.mutation<{ bookingId: string }, string>({
      query: (itemId) => ({ url: `/instant-requests/items/${itemId}/accept`, method: "POST" }),
      transformResponse: (response: { success: boolean; data: { bookingId: string } }) => ({
        bookingId: response.data.bookingId,
      }),
      invalidatesTags: ["InstantRequest", "Booking", "DashboardWorker"],
    }),
    getMyInstantRequests: builder.query<InstantRequest[], void>({
      query: () => "/instant-requests/my-requests",
      transformResponse: (response: InstantRequestsResponse) =>
        response.requests,
      providesTags: ["InstantRequest"],
    }),
  }),
});

export const {
  useCreateInstantRequestMutation,
  useGetNearbyInstantRequestsQuery,
  useCalculateFareMutation,
  useAcceptInstantRequestItemMutation,
  useGetMyInstantRequestsQuery,
} = instantRequestApi;