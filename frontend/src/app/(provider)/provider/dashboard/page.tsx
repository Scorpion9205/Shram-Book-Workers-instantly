"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Briefcase,
  CheckCircle2,
  Users,
  Wallet,
  Zap,
  Plus,
  Star,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/cards/StatCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { StatGridSkeleton, ListSkeleton } from "@/components/loaders/Skeletons";
import { TrendChart } from "@/components/charts/TrendChart";
import { useAppSelector } from "@/hooks/redux";
import { useGetProviderDashboardQuery } from "@/features/dashboard/dashboardApi";

export default function ProviderDashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: dashboard, isLoading, isError, refetch } = useGetProviderDashboardQuery();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <Avatar className="size-12 ring-2 ring-primary/20">
            <AvatarImage src={user?.avatarUrl} alt={user?.name} />
            <AvatarFallback className="text-base">{user?.name?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-muted-foreground">{greeting},</p>
            <h1 className="text-xl font-bold tracking-tight">{user?.name?.split(" ")[0] || "Provider"}</h1>
          </div>
        </div>

        <div className="flex gap-2.5">
          <Button asChild variant="outline">
            <Link href="/provider/jobs/create">
              <Plus className="size-4" /> Create Job
            </Link>
          </Button>
          <Button asChild variant="accent">
            <Link href="/provider/instant-hire">
              <Zap className="size-4" /> Instant Hire
            </Link>
          </Button>
        </div>
      </motion.div>

      {isLoading ? (
        <StatGridSkeleton />
      ) : isError ? (
        <Card className="p-6 text-center">
          <p className="mb-3 text-sm text-muted-foreground">Couldn't load your dashboard.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Active Jobs" value={dashboard?.activeJobs ?? 0} icon={Briefcase} accent="primary" />
          <StatCard
            label="Completed Jobs"
            value={dashboard?.completedJobs ?? 0}
            icon={CheckCircle2}
            accent="success"
            delay={0.05}
          />
          <StatCard label="Workers Hired" value={dashboard?.workersHired ?? 0} icon={Users} accent="accent" delay={0.1} />
          <StatCard
            label="Money Spent"
            value={`₹${dashboard?.moneySpent ?? 0}`}
            icon={Wallet}
            accent="destructive"
            delay={0.15}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Spending Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard?.analyticsTrend?.length ? (
              <TrendChart data={dashboard.analyticsTrend} color="var(--color-primary)" />
            ) : (
              <EmptyState title="No data yet" description="Your spending trend will appear once you complete bookings." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Applicants</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ListSkeleton count={2} />
            ) : dashboard?.recentApplicants?.length ? (
              <div className="space-y-3">
                {dashboard.recentApplicants.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <Avatar className="size-9">
                      <AvatarImage src={a.worker?.avatarUrl} />
                      <AvatarFallback>{a.worker?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.worker?.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="size-3 fill-accent text-accent" /> {a.worker?.rating ?? "—"}
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {a.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Users} title="No applicants yet" description="Post a job to start receiving applications." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ListSkeleton count={3} />
          ) : dashboard?.recentBookings?.length ? (
            <div className="space-y-3">
              {dashboard.recentBookings.map((b) => (
                <Link
                  key={b.id}
                  href={`/provider/booking/${b.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-secondary"
                >
                  <Avatar className="size-10">
                    <AvatarImage src={b.worker?.avatarUrl} />
                    <AvatarFallback>{b.worker?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.worker?.name}</p>
                    <Badge variant="outline" className="mt-0.5 capitalize">
                      {b.status}
                    </Badge>
                  </div>
                  <span className="text-sm font-semibold">₹{b.amount}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon={Briefcase} title="No bookings yet" description="Your worker bookings will appear here." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
