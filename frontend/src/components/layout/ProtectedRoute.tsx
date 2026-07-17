"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/hooks/redux";
import type { UserRole } from "@/types";
import { dashboardPathForRole } from "@/lib/utils/role-routing";

export function ProtectedRoute({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: UserRole;
}) {
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (role && user?.role !== role) {
      router.replace(dashboardPathForRole(user?.role));
    }
  }, [loading, isAuthenticated, user, role, router]);

  if (loading || !isAuthenticated || (role && user?.role !== role)) {
    return (
      <div className="flex h-svh w-full items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

/** Guest-only wrapper for auth pages — redirects logged-in users to their dashboard. */
export function GuestRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) {
      router.replace(dashboardPathForRole(user?.role));
    }
  }, [loading, isAuthenticated, user, router]);

  if (loading) {
    return (
      <div className="flex h-svh w-full items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
