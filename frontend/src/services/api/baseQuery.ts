import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { Mutex } from "@/lib/utils/mutex";
import { API_BASE_URL } from "@/lib/constants";
import { tokenStorage } from "@/lib/utils/token-storage";
import { setAccessToken, clearAuth } from "@/store/authSlice";
import type { RootState } from "@/store";


const mutex = new Mutex();

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.accessToken || tokenStorage.getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    headers.set("Accept", "application/json");
    return headers;
  },
});

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  await mutex.waitForUnlock();
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {

    const url = typeof args === "string" ? args : args.url;
    if (url.includes("/auth/refresh-token")) {
      api.dispatch(clearAuth());
      return result;
    }

    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {

        const refreshResult = await rawBaseQuery(
          {
            url: "/auth/refresh-token",
            method: "POST",
          },
          api,
          extraOptions
        );

        const data = refreshResult.data as
          | { accessToken?: string; data?: { accessToken?: string } }
          | undefined;
        const newAccessToken = data?.accessToken || data?.data?.accessToken;

        if (newAccessToken) {
          api.dispatch(setAccessToken(newAccessToken));
          result = await rawBaseQuery(args, api, extraOptions);
        } else {
          api.dispatch(clearAuth());
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }
      } finally {
        release();
      }
    } else {
      // Another request is already refreshing — wait, then retry.
      await mutex.waitForUnlock();
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};
