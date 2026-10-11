"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, CheckCircle2, Clock, IndianRupee, Star, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/cards/EmptyState";
import { StatCard } from "@/components/cards/StatCard";
import { StatGridSkeleton } from "@/components/loaders/Skeletons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetAgentDashboardQuery, useGetAgentCommissionsQuery } from "@/features/agent/agentApi";

type CommissionPeriod = "today" | "month" | "all";

export default function AgentDashboardPage() {
  const { data, isLoading, isError } = useGetAgentDashboardQuery();
  const { data: commissions } = useGetAgentCommissionsQuery();
  const [period, setPeriod] = useState<CommissionPeriod>("today");

  const periodValue =
    period === "today" ? commissions?.todayEarnings : period === "month" ? commissions?.monthEarnings : commissions?.totalEarnings;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <StatGridSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={Users}
        title="Agent profile needed"
        description="Create your agent profile to start managing workers and applications."
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Agent dashboard</p>
        <h1 className="text-2xl font-bold tracking-tight">{data?.agencyName ?? "Agency"}</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Workers" value={data?.totalWorkers ?? 0} icon={Users} accent="primary" />
        <StatCard label="Available" value={data?.availableWorkers ?? 0} icon={CheckCircle2} accent="success" />
        <StatCard label="Applications" value={data?.pendingApplications ?? 0} icon={Clock} accent="accent" />
        <StatCard label="Rating" value={data?.rating?.toFixed(1) ?? "0.0"} icon={Star} accent="destructive" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-secondary p-4">
            <Briefcase className="mb-2 size-5 text-primary" />
            <p className="text-2xl font-semibold">{data?.activeBookings ?? 0}</p>
            <p className="text-sm text-muted-foreground">Active bookings</p>
          </div>
          <div className="rounded-xl bg-secondary p-4">
            <CheckCircle2 className="mb-2 size-5 text-success" />
            <p className="text-2xl font-semibold">{data?.completedBookings ?? 0}</p>
            <p className="text-sm text-muted-foreground">Completed bookings</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Commission Earnings</CardTitle>
          <Select value={period} onValueChange={(v) => setPeriod(v as CommissionPeriod)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <p className="flex items-center gap-1 text-3xl font-bold">
                <IndianRupee className="size-6" />
                {periodValue ?? 0}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                At {commissions?.commissionPercent ?? 0}% on bookings sourced through your agency
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                ₹{commissions?.pendingCheckoutAmount ?? 0} available to checkout
              </p>
              <Link href="/agent/commissions" className="text-sm font-medium text-primary hover:underline">
                View details
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
