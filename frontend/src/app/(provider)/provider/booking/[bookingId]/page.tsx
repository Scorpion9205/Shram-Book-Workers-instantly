"use client";

import { use, useState, useEffect } from "react";
import { ArrowLeft, Phone, MapPin, Star } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingTimeline } from "@/components/cards/BookingTimeline";
import { ReviewDialog } from "@/components/dialogs/ReviewDialog";
import { EmptyState } from "@/components/cards/EmptyState";
import { useGetBookingByIdQuery } from "@/features/booking/bookingApi";
import { useSocket } from "@/providers/SocketProvider";

export default function ProviderBookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const { data: booking, isLoading, isError, refetch } = useGetBookingByIdQuery(bookingId);
  const [reviewOpen, setReviewOpen] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    socket.on("bookingStatusUpdated", (data: { bookingId: string; status: string }) => {
      if (data.bookingId === bookingId) {
        refetch();
      }
    });
    return () => {
      socket.off("bookingStatusUpdated");
    };
  }, [socket, bookingId, refetch]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !booking) {
    return <EmptyState title="Booking not found" />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/provider/bookings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Bookings
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Booking Status</CardTitle>
        </CardHeader>
        <CardContent>
          <BookingTimeline status={booking.status} />
        </CardContent>
      </Card>

      {booking.status === "CONFIRMED" && booking.startOtp && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center space-y-2">
            <p className="text-sm text-muted-foreground font-semibold">Share this OTP with the worker when they arrive to start the job:</p>
            <div className="text-3xl font-extrabold tracking-wider text-primary">{booking.startOtp}</div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-5 pt-6">

          <div>
            <h2 className="text-2xl font-bold">
              {booking.job?.title}
            </h2>

            <p className="text-muted-foreground">
              {booking.job?.skill?.name}
            </p>
          </div>

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-muted-foreground">
                Budget
              </p>

              <p className="text-2xl font-bold text-primary">
                ₹{booking.amount}
              </p>

            </div>

            <Avatar className="size-16">
              <AvatarImage
                src={booking.worker?.user?.profileImage}
              />
              <AvatarFallback>
                {booking.worker?.user?.name?.[0] || "W"}
              </AvatarFallback>
            </Avatar>

          </div>

          <div className="flex items-center justify-between">

            <div>
              <p className="font-semibold">
                {booking.worker?.user?.name || "Assigning worker..."}
              </p>
            </div>

            {booking.worker?.user?.phone && (
              <Button asChild variant="outline" size="icon">
                <a href={`tel:${booking.worker.user.phone}`}>
                  <Phone className="size-4" />
                </a>
              </Button>
            )}

          </div>

        </CardContent>
      </Card>

      <Card className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <MapPin className="size-4 shrink-0" />
        Live map tracking will appear here once the worker is on the way.
      </Card>
      <div className="border-t pt-4 space-y-2">

        <h3 className="font-semibold">
          Assigned Worker
        </h3>

        <div className="flex items-center gap-4">

          <Avatar className="size-14">

            <AvatarImage
              src={booking.worker?.user?.profileImage}
            />

            <AvatarFallback>
              {booking.worker?.user?.name?.[0]}
            </AvatarFallback>

          </Avatar>

          <div className="flex-1">

            <p className="font-semibold">
              {booking.worker?.user?.name}
            </p>

            <p className="text-sm text-muted-foreground">
              {booking.worker?.user?.phone}
            </p>

            <div className="mt-2 flex gap-4 text-sm text-muted-foreground">

              <span>
                ⭐ {booking.worker?.rating}
              </span>

              <span>
                {booking.worker?.experience} yrs
              </span>

              <span>
                {booking.worker?.totalJobs} Jobs
              </span>

            </div>

          </div>

        </div>

      </div>
      {booking.status === "COMPLETED" && !booking.review && (
        <Button className="w-full" size="lg" variant="outline" onClick={() => setReviewOpen(true)}>
          <Star className="size-4" /> Rate this Worker
        </Button>
      )}

      <ReviewDialog bookingId={bookingId} open={reviewOpen} onOpenChange={setReviewOpen} />
    </div>
  );
}
