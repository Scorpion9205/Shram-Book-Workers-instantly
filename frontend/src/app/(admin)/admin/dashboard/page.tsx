"use client";

import { motion } from "framer-motion";
import { Users, CalendarCheck, Sliders, Mail, HardHat, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useGetUsersQuery } from "@/features/admin/adminApi";
import { useGetBookingsQuery } from "@/features/admin/adminApi";

export default function AdminDashboardPage() {
  const { data: usersData, isLoading: isLoadingUsers } = useGetUsersQuery({ page: 1, limit: 1 });
  const { data: bookingsData, isLoading: isLoadingBookings } = useGetBookingsQuery({ page: 1, limit: 1 });

  const totalUsersCount = usersData?.meta?.totalCount ?? 0;
  const totalBookingsCount = bookingsData?.meta?.totalCount ?? 0;

  const stats = [
    {
      title: "Total Registered Users",
      value: isLoadingUsers ? "..." : totalUsersCount.toString(),
      description: "Workers, Providers, and Agents",
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      href: "/admin/users",
    },
    {
      title: "Total Service Bookings",
      value: isLoadingBookings ? "..." : totalBookingsCount.toString(),
      description: "Normal jobs and instant requests",
      icon: CalendarCheck,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      href: "/admin/bookings",
    },
    {
      title: "Platform Configurations",
      value: "9",
      description: "Radius parameters, commission settings",
      icon: Sliders,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      href: "/admin/settings",
    },
    {
      title: "Notification Templates",
      value: "6",
      description: "Transactional Email & SMS setups",
      icon: Mail,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      href: "/admin/templates",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground">Manage users, bookings, pricing, and notification templates.</p>
      </div>

      {/* Grid of stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <div className={`rounded-lg p-2 ${stat.bg} ${stat.color}`}>
                    <stat.icon className="size-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Action Guides */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Management Guidelines</CardTitle>
          <CardDescription>Actions you can perform as an Administrator.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-start">
            <div className="rounded-full bg-blue-500/10 p-2.5 text-blue-500 shrink-0">
              <Users className="size-5" />
            </div>
            <div>
              <h4 className="font-semibold">User Verification & Safety</h4>
              <p className="text-sm text-muted-foreground">
                Approve worker applications, verify details, and suspend user accounts if terms of service are breached.
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="rounded-full bg-emerald-500/10 p-2.5 text-emerald-500 shrink-0">
              <CalendarCheck className="size-5" />
            </div>
            <div>
              <h4 className="font-semibold">Booking Oversight</h4>
              <p className="text-sm text-muted-foreground">
                Monitor live instant request broadcasts and manually assign workers or agents to resolve pending jobs.
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="rounded-full bg-amber-500/10 p-2.5 text-amber-500 shrink-0">
              <Sliders className="size-5" />
            </div>
            <div>
              <h4 className="font-semibold">Settings Customization</h4>
              <p className="text-sm text-muted-foreground">
                Tweak demand multipliers, radius search parameters, work start intervals, and commission rates in real-time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
