import { apiSlice } from "@/services/api/apiSlice";
import type { ProviderProfile } from "@/types";

interface ProviderProfileResponse {
  success: boolean;
  provider?: ProviderProfile;
  profile?: ProviderProfile;
}

export const providerApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createProviderProfile: builder.mutation<ProviderProfile, Partial<ProviderProfile>>({
      query: (body) => ({ url: "/providers/profile", method: "POST", body }),
      transformResponse: (response: ProviderProfileResponse) =>
        response.profile!,
      invalidatesTags: ["ProviderProfile"],
    }),
    getMyProviderProfile: builder.query<ProviderProfile, void>({
      query: () => "/providers/me",
      transformResponse: (response: ProviderProfileResponse) =>
        response.provider!,
      providesTags: ["ProviderProfile"],
    }),
    updateMyProviderProfile: builder.mutation<ProviderProfile, Partial<ProviderProfile>>({
      query: (body) => ({ url: "/providers/me", method: "PATCH", body }),
      transformResponse: (response: ProviderProfileResponse) =>
        response.provider!,
      invalidatesTags: ["ProviderProfile"],
    }),
  }),
});

export const {
  useCreateProviderProfileMutation,
  useGetMyProviderProfileQuery,
  useUpdateMyProviderProfileMutation,
} = providerApi;
