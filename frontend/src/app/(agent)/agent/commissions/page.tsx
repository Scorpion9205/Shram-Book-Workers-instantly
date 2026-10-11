"use client";

import { useState } from "react";
import { Wallet, Percent, Briefcase, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/cards/StatCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { StatGridSkeleton, ListSkeleton } from "@/components/loaders/Skeletons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetAgentCommissionsQuery, useCheckoutCommissionMutation } from "@/features/agent/agentApi";

type CommissionPeriod = "today" | "month" | "all";

const PERIOD_LABELS: Record<CommissionPeriod, string> = {
  today: "Today's Earnings",
  month: "This Month's Earnings",
  all: "Total Earnings",
};

export default function AgentCommissionsPage() {
  const { data, isLoading } = useGetAgentCommissionsQuery();
  const [checkout, { isLoading: isCheckingOut }] = useCheckoutCommissionMutation();
  const [period, setPeriod] = useState<CommissionPeriod>("all");

  const periodValue =
    period === "today" ? data?.todayEarnings : period === "month" ? data?.monthEarnings : data?.totalEarnings;

  const pending = data?.pendingCheckoutAmount ?? 0;
  const minimum = data?.minimumCheckoutAmount ?? 2000;
  const canCheckout = pending >= minimum;

  async function handleCheckout() {
    try {
      const result = await checkout().unwrap();
      toast.success(`₹${result.checkedOutAmount} commission checked out.`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Couldn't checkout commission.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Commissions</h1>
          <p className="text-sm text-muted-foreground">
            Earnings from completed, paid bookings sourced through your agency.
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as CommissionPeriod)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <StatGridSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label={PERIOD_LABELS[period]}
            value={`₹${periodValue ?? 0}`}
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

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Available to Checkout</p>
            <p className="mt-1 flex items-center gap-1 text-2xl font-bold">
              <IndianRupee className="size-5" />
              {pending}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {canCheckout
                ? "Ready to checkout."
                : `Minimum ₹${minimum} required — ₹${Math.max(minimum - pending, 0)} more to go.`}
            </p>
          </div>
          <Button onClick={handleCheckout} disabled={!canCheckout} loading={isCheckingOut}>
            <Wallet className="size-4" /> Checkout Commission
          </Button>
        </div>
      </Card>

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
