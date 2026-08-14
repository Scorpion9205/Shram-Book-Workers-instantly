"use client";

import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/cards/EmptyState";
import { ListSkeleton } from "@/components/loaders/Skeletons";
import { useGetProviderBookingsQuery } from "@/features/booking/bookingApi";

import type { BookingStatus } from "@/types";

const statusVariant: Record<BookingStatus, "outline" | "default" | "success" | "destructive"> = {
  CREATED: "outline",
  PAYMENT_PENDING: "outline",
  PAYMENT_CONFIRMED: "default",
  WORKER_ASSIGNED: "default",
  WORKER_EN_ROUTE: "default",
  OTP_VERIFIED: "default",
  WORK_STARTED: "default",
  WORK_COMPLETED: "success",
  PAYMENT_SETTLED: "success",
  REVIEWED: "success",
  CLOSED: "outline",
  CANCELLED_BY_PROVIDER: "destructive",
  CANCELLED_BY_WORKER: "destructive",
  EXPIRED: "destructive",
  DISPUTED: "destructive",
};

export default function ProviderBookingsPage() {
  const { data, isLoading } = useGetProviderBookingsQuery();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground">Track your active and completed bookings.</p>
      </div>

      {isLoading ? (
        <ListSkeleton count={4} />
      ) : !data?.length ? (
        <EmptyState icon={CalendarCheck} title="No bookings" description="Bookings from hired workers will appear here." />
      ) : (
        <div className="space-y-3">
          {data.map((booking) => (
            <Link key={booking.id} href={`/provider/booking/${booking.id}`}>
              <Card className="flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5">
                <Avatar className="size-11">
                  <AvatarImage src={booking.worker?.user?.profileImage} />
                  <AvatarFallback>{booking.worker?.user?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{booking.worker?.user?.name || "Assigning worker..."}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(booking.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <span className="text-sm font-semibold">₹{booking.amount}</span>
                <Badge
                  variant={statusVariant[booking.status]}
                >
                  {booking.status.replace("_", " ")}
                </Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
