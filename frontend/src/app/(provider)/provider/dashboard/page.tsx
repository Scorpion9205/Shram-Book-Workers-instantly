"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ProviderDashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const [range, setRange] = useState<string>("7days");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: dashboard, isLoading, isError, refetch } = useGetProviderDashboardQuery({
    range,
    startDate: range === "custom" && startDate ? startDate : undefined,
    endDate: range === "custom" && endDate ? endDate : undefined,
  });

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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Active Jobs"
            value={dashboard?.activeJobs ?? 0}
            icon={Briefcase}
            accent="primary"
          />

          <StatCard
            label="Completed Jobs"
            value={dashboard?.completedJobs ?? 0}
            icon={CheckCircle2}
            accent="success"
            delay={0.05}
          />

          <StatCard
            label="Workers Hired"
            value={dashboard?.workersHired ?? 0}
            icon={Users}
            accent="accent"
            delay={0.1}
          />

          <StatCard
            label="Today's Spend"
            value={`₹${dashboard?.todaySpent ?? 0}`}
            icon={Wallet}
            accent="destructive"
            delay={0.15}
          />

          <StatCard
            label="Week Spend"
            value={`₹${dashboard?.thisWeekSpent ?? 0}`}
            icon={Wallet}
            accent="primary"
            delay={0.2}
          />

          <StatCard
            label="Month Spend"
            value={`₹${dashboard?.thisMonthSpent ?? 0}`}
            icon={Wallet}
            accent="success"
            delay={0.25}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 space-y-0 pb-4">
            <CardTitle>Spending Analytics</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {range === "custom" && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
              )}
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="h-9 w-[130px] rounded-lg">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="1month">Last 1 month</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                      <AvatarImage
                        src={
                          a.worker?.user?.profileImage ??
                          a.agent?.user?.profileImage
                        }
                      />

                      <AvatarFallback>
                        {(a.worker?.user?.name ??
                          a.agent?.user?.name)?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {a.worker?.user?.name ??
                          a.agent?.user?.name}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="size-3 fill-accent text-accent" />
                        {a.worker?.rating ??
                          a.agent?.rating ??
                          "—"}
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
                    <AvatarImage src={b.worker?.user?.profileImage} />
                    <AvatarFallback>{b.worker?.user?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.worker?.user?.name}</p>
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
