"use client";

import { use, useState } from "react";
import { ArrowLeft, Phone, MapPin, Star } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingTimeline } from "@/components/cards/BookingTimeline";
import { ReviewDialog } from "@/components/dialogs/ReviewDialog";
import { EmptyState } from "@/components/cards/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGetBookingByIdQuery,
  useStartBookingMutation,
  useCompleteBookingMutation,
} from "@/features/booking/bookingApi";

export default function WorkerBookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const { data: booking, isLoading, isError } = useGetBookingByIdQuery(bookingId);
  const [startBooking, { isLoading: isStarting }] = useStartBookingMutation();
  const [completeBooking, { isLoading: isCompleting }] = useCompleteBookingMutation();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [otp, setOtp] = useState("");

  async function handleStart() {
    if (booking?.startOtp && !otp.trim()) {
      toast.error("Please enter the OTP shared by the provider");
      return;
    }
    try {
      await startBooking({ bookingId, otp }).unwrap();
      toast.success("Job started!");
    } catch (err: unknown) {
      const message = (err as { data?: { message?: string } })?.data?.message || "Couldn't start the job.";
      toast.error(message);
    }
  }

  async function handleComplete() {
    try {
      await completeBooking(bookingId).unwrap();
      toast.success("Job marked as completed!");
    } catch (err: unknown) {
      const message = (err as { data?: { message?: string } })?.data?.message || "Couldn't complete the job.";
      toast.error(message);
    }
  }

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
      <Link href="/worker/bookings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
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

      {/* <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="size-14">
           <AvatarImage src={booking.provider?.profileImage} />
            <AvatarFallback>{booking.provider?.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">{booking.provider?.name}</p>
            <p className="text-sm text-muted-foreground">Amount: ₹{booking.amount}</p>
          </div>
          {booking.provider?.phone && (
            <Button asChild variant="outline" size="icon">
              <a href={`tel:${booking.provider.phone}`}>
                <Phone className="size-4" />
              </a>
            </Button>
          )}
        </CardContent>
      </Card> */}
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
                Earnings
              </p>

              <p className="text-2xl font-bold text-primary">
                ₹{booking.amount}
              </p>

            </div>

            <Avatar className="size-16">

              <AvatarImage
                src={booking.provider?.profileImage}
              />

              <AvatarFallback>
                {booking.provider?.name?.[0]}
              </AvatarFallback>

            </Avatar>

          </div>

          <div>

            <p className="font-semibold">
              {booking.provider?.name}
            </p>

            <p className="text-sm text-muted-foreground">
             
            </p>
             {booking.provider?.phone && (
            <Button asChild variant="outline" size="icon">
              <a href={`tel:${booking.provider.phone}`}>
                <Phone className="size-4" />
              </a>
            </Button>
             )}
          </div>

        </CardContent>
      </Card>
      <Card>
  <CardContent className="pt-6">

    <div className="flex gap-3">

      <MapPin className="mt-1 size-5 text-primary" />

      <div>

        <h3 className="font-semibold">
          Work Location
        </h3>

        <p className="mt-2">
          {booking.job?.address || booking.instantRequest?.address}
        </p>

        {booking.job && (
          <p className="text-muted-foreground">
            {booking.job.city}
            {booking.job.state && `, ${booking.job.state}`}
          </p>
        )}

      </div>

    </div>

  </CardContent>
</Card>
      

      {booking.status === "CONFIRMED" && booking.startOtp && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            <Label htmlFor="start-otp">Enter Start OTP shared by Provider:</Label>
            <Input
              id="start-otp"
              type="text"
              placeholder="e.g. 1234"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="text-center font-bold text-lg tracking-wider"
              maxLength={4}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        {booking.status === "CONFIRMED" && (
          <Button className="flex-1" size="lg" onClick={handleStart} loading={isStarting}>
            Start Job
          </Button>
        )}
        {booking.status === "IN_PROGRESS" && (
          <Button className="flex-1" size="lg" onClick={handleComplete} loading={isCompleting}>
            Mark Completed
          </Button>
        )}
      </div>
    </div>
  );
}
