"use client";

import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { workerNavItems, workerBottomNavItems } from "@/lib/constants/nav";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { useGetMyWorkerProfileQuery } from "@/features/worker/workerApi";
import { useAppSelector } from "@/hooks/redux";

function WorkerLocationTracker() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { data: profile } = useGetMyWorkerProfileQuery(undefined, {
    skip: !isAuthenticated,
  });
  useLiveLocation(Boolean(profile?.isAvailable));
  return null;
}

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute role="worker">
      <WorkerLocationTracker />
      <DashboardShell sidebarItems={workerNavItems} bottomNavItems={workerBottomNavItems}>
        {children}
      </DashboardShell>
    </ProtectedRoute>
  );
}
