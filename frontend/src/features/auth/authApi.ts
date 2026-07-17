import { apiSlice } from "@/services/api/apiSlice";
import type { User } from "@/types";

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

export interface SignupPayload {
  name: string;
  phone: string;
  email?: string;
  password: string;
  role: "worker" | "provider" | "agent";
}

type BackendRole = "WORKER" | "PROVIDER" | "AGENT" | "worker" | "provider" | "agent";

interface BackendAuthResponse {
  user: Omit<User, "role"> & { role: BackendRole };
  accessToken: string;
  refreshToken?: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}
export interface ChangePasswordPayload {

  currentPassword: string;

  newPassword: string;

}

export interface OtpPayload {
  identifier: string;
}

export interface VerifyOtpPayload {
  identifier: string;
  otp: string;
}

export interface ForgotPasswordPayload {
  identifier: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}
export interface SignupResponse {
  success: boolean;
  message: string;
}

const normalizeRole = (role: BackendRole): User["role"] =>
  role.toLowerCase() as User["role"];

const normalizeAuthResponse = (
  response: BackendAuthResponse
): AuthResponse => ({
  ...response,
  user: {
    ...response.user,
    role: normalizeRole(response.user.role),
  },
});

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    signup: builder.mutation<SignupResponse, SignupPayload>({
      query: (body) => ({
        url: "/auth/signup",
        method: "POST",
        body: {
          ...body,
          role: body.role.toUpperCase(),
        },
      }),

    }),
    login: builder.mutation<AuthResponse, LoginPayload>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      transformResponse: normalizeAuthResponse,
      invalidatesTags: ["User"],
    }),
    changePassword: builder.mutation<
      { success: boolean; message: string },
      ChangePasswordPayload
    >({
      query: (body) => ({
        url: "/auth/change-password",
        method: "PATCH",
        body,
      }),

    }),
    refreshToken: builder.mutation<{ accessToken: string }, { refreshToken?: string | null }>({
      query: (body) => ({ url: "/auth/refresh-token", method: "POST", body }),
    }),
    logout: builder.mutation<{ success: boolean }, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
    }),
    forgotPassword: builder.mutation<{ success: boolean }, ForgotPasswordPayload>({
      query: (body) => ({ url: "/auth/forgot-password", method: "POST", body }),
    }),
    resetPassword: builder.mutation<{ success: boolean }, ResetPasswordPayload>({
      query: (body) => ({ url: "/auth/reset-password", method: "POST", body }),
    }),
    sendOtp: builder.mutation<{ success: boolean }, OtpPayload>({
      query: (body) => ({ url: "/auth/send-otp", method: "POST", body }),
    }),
    verifyOtp: builder.mutation<AuthResponse, VerifyOtpPayload>({
      query: (body) => ({ url: "/auth/verify-otp", method: "POST", body }),
      transformResponse: normalizeAuthResponse,
    }),
    resendOtp: builder.mutation<{ success: boolean }, OtpPayload>({
      query: (body) => ({ url: "/auth/resend-otp", method: "POST", body }),
    }),
  }),
});

export const {
  useSignupMutation,
  useLoginMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
  useChangePasswordMutation,
} = authApi;
