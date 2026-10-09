"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, CalendarCheck, Wallet, UserCheck, Briefcase } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/cards/StatCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { StatGridSkeleton } from "@/components/loaders/Skeletons";
import { TrendChart } from "@/components/charts/TrendChart";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetPlatformAnalyticsQuery } from "@/features/admin/adminApi";

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<string>("7days");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: response, isLoading, isError, refetch } = useGetPlatformAnalyticsQuery({
    range,
    startDate: range === "custom" && startDate ? startDate : undefined,
    endDate: range === "custom" && endDate ? endDate : undefined,
  });

  const analytics = response?.data;

  const RangePicker = (
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
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Analytics</h1>
          <p className="text-muted-foreground">Revenue, growth, and activity across the whole platform.</p>
        </div>
        {RangePicker}
      </motion.div>

      {isLoading ? (
        <StatGridSkeleton />
      ) : isError ? (
        <Card className="p-6 text-center">
          <p className="mb-3 text-sm text-muted-foreground">Couldn't load platform analytics.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Total Revenue"
            value={`₹${analytics?.totalRevenue ?? 0}`}
            icon={Wallet}
            accent="success"
          />
          <StatCard
            label="Total Bookings"
            value={analytics?.totalBookings ?? 0}
            icon={CalendarCheck}
            accent="primary"
            delay={0.05}
          />
          <StatCard
            label="Total Users"
            value={analytics?.totalUsers ?? 0}
            icon={Users}
            accent="accent"
            delay={0.1}
          />
          <StatCard
            label="Active Workers"
            value={analytics?.activeWorkers ?? 0}
            icon={UserCheck}
            accent="success"
            delay={0.15}
          />
          <StatCard
            label="Active Providers"
            value={analytics?.activeProviders ?? 0}
            icon={Briefcase}
            accent="primary"
            delay={0.2}
          />
          <StatCard
            label="Total Jobs Posted"
            value={analytics?.totalJobs ?? 0}
            icon={Briefcase}
            accent="destructive"
            delay={0.25}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.revenueTrend?.some((d) => d.value > 0) ? (
              <TrendChart data={analytics.revenueTrend} color="var(--color-success)" />
            ) : (
              <EmptyState title="No revenue yet" description="Revenue will appear here once payments are completed." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.bookingTrend?.some((d) => d.value > 0) ? (
              <TrendChart data={analytics.bookingTrend} color="var(--color-primary)" />
            ) : (
              <EmptyState title="No bookings yet" description="New bookings in this range will show up here." />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>New Signups</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.signupTrend?.some((d) => d.value > 0) ? (
              <TrendChart data={analytics.signupTrend} color="var(--color-accent)" />
            ) : (
              <EmptyState title="No new signups yet" description="New user registrations in this range will show up here." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
