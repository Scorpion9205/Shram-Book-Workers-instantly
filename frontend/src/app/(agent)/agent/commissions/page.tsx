"use client";

import { Wallet, Percent, Briefcase } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/cards/StatCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { StatGridSkeleton, ListSkeleton } from "@/components/loaders/Skeletons";
import { useGetAgentCommissionsQuery } from "@/features/agent/agentApi";

export default function AgentCommissionsPage() {
  const { data, isLoading } = useGetAgentCommissionsQuery();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Commissions</h1>
        <p className="text-sm text-muted-foreground">
          Earnings from completed, paid bookings sourced through your agency.
        </p>
      </div>

      {isLoading ? (
        <StatGridSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Earnings"
            value={`₹${data?.totalEarnings ?? 0}`}
            icon={Wallet}
            accent="success"
          />
          <StatCard
            label="Commission Rate"
            value={data?.commissionPercent ?? 0}
            suffix="%"
            icon={Percent}
            accent="primary"
            delay={0.05}
          />
          <StatCard
            label="Commissionable Bookings"
            value={data?.bookingCount ?? 0}
            icon={Briefcase}
            accent="accent"
            delay={0.1}
          />
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Recent Commissions</h2>
        {isLoading ? (
          <ListSkeleton count={4} />
        ) : !data?.recentCommissions.length ? (
          <EmptyState
            icon={Wallet}
            title="No commissions yet"
            description="You'll earn a commission once a booking you sourced is completed and paid."
          />
        ) : (
          <div className="space-y-3">
            {data.recentCommissions.map((c) => (
              <Card key={c.bookingId} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium">Booking #{c.bookingId.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    Gross: ₹{c.grossAmount}
                    {c.completedAt ? ` · ${new Date(c.completedAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold text-success">₹{c.commission}</span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
