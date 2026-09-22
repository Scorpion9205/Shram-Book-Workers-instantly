import { apiSlice } from "@/services/api/apiSlice";

export interface LocationUpdatePayload {
  latitude: number;
  longitude: number;
}

export interface LocationResult extends LocationUpdatePayload {
  updatedAt: string;
}

interface LocationResponse {
  success: boolean;
  location: LocationResult;
}

export const locationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    updateLocation: builder.mutation<LocationResult, LocationUpdatePayload>({
      query: (body) => ({ url: "/location/update", method: "POST", body }),
      transformResponse: (response: any) => {
        const data = response.data || response;
        return data.location || data;
      },
      invalidatesTags: ["Location"],
    }),
    getMyLocation: builder.query<LocationResult, void>({
      query: () => "/location/me",
      transformResponse: (response: any) => {
        const data = response.data || response;
        return data.location || data;
      },
      providesTags: ["Location"],
    }),
  }),
});

export const { useUpdateLocationMutation, useGetMyLocationQuery } = locationApi;
