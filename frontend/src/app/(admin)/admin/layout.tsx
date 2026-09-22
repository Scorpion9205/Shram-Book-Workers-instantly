"use client";

import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { adminNavItems, adminBottomNavItems } from "@/lib/constants/nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute role="admin">
      <DashboardShell sidebarItems={adminNavItems} bottomNavItems={adminBottomNavItems}>
        {children}
      </DashboardShell>
    </ProtectedRoute>
  );
}
