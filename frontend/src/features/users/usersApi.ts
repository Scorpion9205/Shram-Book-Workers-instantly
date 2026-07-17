import { apiSlice } from "@/services/api/apiSlice";
import type { User } from "@/types";

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
  endpoints: (builder) => ({
    getMe: builder.query<User, void>({
      query: () => "/users/me",
      transformResponse: (response: BackendUserResponse) =>
        normalizeUser(response.user),
      providesTags: ["User"],
    }),
    updateMe: builder.mutation<User, Partial<User>>({
      query: (body) => ({ url: "/users/me", method: "PATCH", body }),
      transformResponse: (response: BackendUserResponse) =>
        normalizeUser(response.user),
      invalidatesTags: ["User"],
    }),
    deleteMe: builder.mutation<{ success: boolean }, void>({
      query: () => ({ url: "/users/me", method: "DELETE" }),
    }),
  
  }),
});

export const {
  useGetMeQuery,
  useLazyGetMeQuery,
  useUpdateMeMutation,
  useDeleteMeMutation,
 
} = usersApi;
