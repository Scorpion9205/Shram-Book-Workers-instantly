"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { setCredentials, finishedLoading, clearAuth } from "@/store/authSlice";
import { tokenStorage } from "@/lib/utils/token-storage";
import { useLazyGetMeQuery } from "@/features/users/usersApi";

/**
 * On first mount, check for a persisted access token. If found, fetch the
 * current user to re-hydrate the session. If the token is invalid/expired,
 * the RTK Query baseQuery's 401 handler will attempt a silent refresh;
 * if that also fails, auth is cleared.
 */
export function AuthInitProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const loading = useAppSelector((s) => s.auth.loading);
  const [getMe] = useLazyGetMeQuery();

  useEffect(() => {
    const init = async () => {
      const token = tokenStorage.getAccessToken();
      if (!token) {
        dispatch(finishedLoading());
        return;
      }
      try {
        const user = await getMe().unwrap();
        dispatch(setCredentials({ user, accessToken: token }));
      } catch {
        dispatch(clearAuth());
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex h-svh w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading SHRAM…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
