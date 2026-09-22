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
      transformResponse: (response: any) => {
        const data = response.data || response;
        return data.profile || data.provider || data;
      },
      invalidatesTags: ["ProviderProfile"],
    }),
    getMyProviderProfile: builder.query<ProviderProfile, void>({
      query: () => "/providers/me",
      transformResponse: (response: any) => {
        const data = response.data || response;
        return data.provider || data.profile || data;
      },
      providesTags: ["ProviderProfile"],
    }),
    updateMyProviderProfile: builder.mutation<ProviderProfile, Partial<ProviderProfile>>({
      query: (body) => ({ url: "/providers/me", method: "PATCH", body }),
      transformResponse: (response: any) => {
        const data = response.data || response;
        return data.provider || data.profile || data;
      },
      invalidatesTags: ["ProviderProfile"],
    }),
  }),
});

export const {
  useCreateProviderProfileMutation,
  useGetMyProviderProfileQuery,
  useUpdateMyProviderProfileMutation,
} = providerApi;
