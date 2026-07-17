"use client";

import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { providerNavItems, providerBottomNavItems } from "@/lib/constants/nav";

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute role="provider">
      <DashboardShell sidebarItems={providerNavItems} bottomNavItems={providerBottomNavItems}>
        {children}
      </DashboardShell>
    </ProtectedRoute>
  );
}
