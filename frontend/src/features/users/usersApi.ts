import { apiSlice } from "@/services/api/apiSlice";
import type { User } from "@/types";
import { setUser } from "@/store/authSlice";

type BackendRole = "WORKER" | "PROVIDER" | "AGENT" | "worker" | "provider";

interface BackendUserResponse {
  success: boolean;
  user: Omit<User, "role"> & { role: BackendRole };
}

const normalizeUser = (
  user: Omit<User, "role"> & { role: BackendRole }
): User => ({
  ...user,
  role: user.role.toLowerCase() as User["role"],
});

export const usersApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getMe: builder.query<User, void>({
      query: () => "/users/me",
      transformResponse: (response: any) => {
        const data = response.data || response;
        return normalizeUser(data.user || data);
      },
      providesTags: ["User"],
    }),
    updateMe: builder.mutation<User, Partial<User>>({
      query: (body) => ({ url: "/users/me", method: "PATCH", body }),
      transformResponse: (response: any) => {
        const data = response.data || response;
        return normalizeUser(data.user || data);
      },
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data: updatedUser } = await queryFulfilled;
          dispatch(setUser(updatedUser));
        } catch {
          // silently catch mutation failures
        }
      },
      invalidatesTags: ["User"],
    }),
    deleteMe: builder.mutation<{ success: boolean }, void>({
      query: () => ({ url: "/users/me", method: "DELETE" }),
    }),
    uploadProfileImage: builder.mutation<{ success: boolean; profileImage: string }, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append("profileImage", file);
        return {
          url: "/users/upload-profile-image",
          method: "POST",
          body: formData,
        };
      },
      transformResponse: (response: any) => {
        return response.data || response;
      },
      async onQueryStarted(arg, { dispatch, getState, queryFulfilled }) {
        try {
          const { data: result } = await queryFulfilled;
          const state = getState() as any;
          const currentUser = state.auth.user;
          if (currentUser) {
            dispatch(setUser({
              ...currentUser,
              profileImage: result.profileImage,
            }));
          }
        } catch {
          // silently catch
        }
      },
      invalidatesTags: ["User"],
    }),
    deleteProfileImage: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: "/users/profile-image",
        method: "DELETE",
      }),
      async onQueryStarted(arg, { dispatch, getState, queryFulfilled }) {
        try {
          await queryFulfilled;
          const state = getState() as any;
          const currentUser = state.auth.user;
          if (currentUser) {
            dispatch(setUser({
              ...currentUser,
              profileImage: null,
            }));
          }
        } catch {
          // silently catch
        }
      },
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useGetMeQuery,
  useLazyGetMeQuery,
  useUpdateMeMutation,
  useDeleteMeMutation,
  useUploadProfileImageMutation,
  useDeleteProfileImageMutation,
} = usersApi;
