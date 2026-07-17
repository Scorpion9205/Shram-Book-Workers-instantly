"use client";

import { Users } from "lucide-react";
import { EmptyState } from "@/components/cards/EmptyState";

export default function AgentWorkersPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <EmptyState
        icon={Users}
        title="Worker management coming next"
        description="The backend exposes agent dashboard, applications, and bookings. Worker linking APIs are not available yet."
      />
    </div>
  );
}
