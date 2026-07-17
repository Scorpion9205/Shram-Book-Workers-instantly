"use client";

import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/cards/EmptyState";
import { ListSkeleton } from "@/components/loaders/Skeletons";
import { useGetWorkerBookingsQuery } from "@/features/booking/bookingApi";

const statusVariant = {
  PENDING: "outline",
  CONFIRMED: "default",
  IN_PROGRESS: "default",
  COMPLETED: "success",
  CANCELLED: "destructive",
} as const;

export default function WorkerBookingsPage() {
  const { data, isLoading } = useGetWorkerBookingsQuery();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">My Bookings</h1>
        <p className="text-sm text-muted-foreground">All your confirmed and past bookings.</p>
      </div>

      {isLoading ? (
        <ListSkeleton count={4} />
      ) : !data?.length ? (
        <EmptyState icon={CalendarCheck} title="No bookings" description="Accepted jobs and instant requests will appear here." />
      ) : (
        <div className="space-y-3">
          {data.map((booking) => (
            <Link key={booking.id} href={`/worker/booking/${booking.id}`}>
              <Card className="flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5">
                <Avatar className="size-11">
                  <AvatarImage src={booking.provider?.profileImage} />
                  <AvatarFallback>{booking.provider?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{booking.provider?.name}</p>
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
