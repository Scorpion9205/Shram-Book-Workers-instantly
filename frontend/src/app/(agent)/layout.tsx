"use client";

import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { agentBottomNavItems, agentNavItems } from "@/lib/constants/nav";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute role="agent">
      <DashboardShell sidebarItems={agentNavItems} bottomNavItems={agentBottomNavItems}>
        {children}
      </DashboardShell>
    </ProtectedRoute>
  );
}
