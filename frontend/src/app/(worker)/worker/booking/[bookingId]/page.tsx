"use client";

import { use, useState, useEffect } from "react";
import { ArrowLeft, Phone, MapPin } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingTimeline } from "@/components/cards/BookingTimeline";
import { EmptyState } from "@/components/cards/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  useGetBookingByIdQuery,
  useWorkerEnRouteMutation,
  useVerifyStartOtpMutation,
  useCompleteBookingMutation,
  useSettleOfflineBookingMutation,
} from "@/features/booking/bookingApi";
import { useSocket } from "@/providers/SocketProvider";

export default function WorkerBookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const { data: booking, isLoading, isError, refetch } = useGetBookingByIdQuery(bookingId);
  const [workerEnRoute, { isLoading: isEnRouteLoading }] = useWorkerEnRouteMutation();
  const [verifyStartOtp, { isLoading: isVerifying }] = useVerifyStartOtpMutation();
  const [completeBooking, { isLoading: isCompleting }] = useCompleteBookingMutation();
  const [settleOfflineBooking, { isLoading: isSettlingOffline }] = useSettleOfflineBookingMutation();
  const [otp, setOtp] = useState("");
  const { socket } = useSocket();

  async function handleSettleOffline() {
    try {
      await settleOfflineBooking(bookingId).unwrap();
      toast.success("Payment marked as received! The job is now fully settled and completed.");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to confirm payment.");
    }
  }

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

  async function handleStartJourney() {
    try {
      await workerEnRoute(bookingId).unwrap();
      toast.success("Journey started! Head to the provider's location.");
    } catch (err: unknown) {
      const message = (err as { data?: { message?: string } })?.data?.message || "Couldn't start journey.";
      toast.error(message);
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) {
      toast.error("Please enter the 4-digit start OTP shared by the provider");
      return;
    }
    try {
      await verifyStartOtp({ bookingId, code: otp }).unwrap();
      toast.success("OTP verified and job started!");
    } catch (err: unknown) {
      const message = (err as { data?: { message?: string } })?.data?.message || "Invalid OTP code.";
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
      <div className="flex items-center justify-between">
        <Link href="/worker/bookings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to Bookings
        </Link>
        {booking.paymentMode === "ONLINE" ? (
          <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white border-none px-3 py-1 text-xs rounded-full">
            Paid Online (Prepaid)
          </Badge>
        ) : (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-none px-3 py-1 text-xs rounded-full">
            Cash / UPI on Completion (Offline)
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Status</CardTitle>
        </CardHeader>
        <CardContent>
          <BookingTimeline status={booking.status} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div>
            <h2 className="text-2xl font-bold">
              {booking.job?.title || booking.instantRequest?.title}
            </h2>
            <p className="text-muted-foreground">
              {booking.job?.skill?.name || "Instant Booking"}
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
              <AvatarImage src={booking.provider?.profileImage} />
              <AvatarFallback>
                {booking.provider?.name?.[0]}
              </AvatarFallback>
            </Avatar>
          </div>

          <div>
            <p className="font-semibold">
              {booking.provider?.name}
            </p>
            {booking.provider?.phone && (
              <Button asChild variant="outline" size="sm" className="mt-2">
                <a href={`tel:${booking.provider.phone}`}>
                  <Phone className="size-4 mr-2" /> Call Provider
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
              <p className="mt-2 text-sm text-muted-foreground">
                {booking.job?.address || booking.instantRequest?.address}
              </p>
              {booking.job && (
                <p className="text-xs text-muted-foreground mt-1">
                  {booking.job.city}
                  {booking.job.state && `, ${booking.job.state}`}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {booking.status === "WORKER_EN_ROUTE" && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            <Label htmlFor="start-otp" className="font-medium">Enter Start OTP shared by Provider:</Label>
            <Input
              id="start-otp"
              type="text"
              placeholder="e.g. 1234"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="text-center font-bold text-lg tracking-wider max-w-xs mx-auto"
              maxLength={4}
            />
          </CardContent>
        </Card>
      )}

      {booking.status === "WORK_COMPLETED" && booking.paymentMode === "OFFLINE" && (
        <Card className="border-2 border-emerald-500 bg-emerald-50/10">
          <CardHeader>
            <CardTitle className="text-emerald-600 flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              Collect Payment (₹{booking.amount})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please collect the payment from the provider. Show this UPI QR code for scanning, or collect cash directly.
            </p>
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-emerald-100">
              <img
                src={`https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(
                  `upi://pay?pa=shram@upi&pn=Shram&am=${booking.amount}&tr=${booking.id}&tn=Payment+for+Booking+${booking.id}`
                )}`}
                alt="Payment QR Code"
                className="w-48 h-48"
              />
              <p className="text-xs text-muted-foreground mt-2 font-mono">Scan using any UPI App (GPay/PhonePe)</p>
            </div>
            <Button
              className="w-full text-white bg-emerald-600 hover:bg-emerald-700"
              size="lg"
              onClick={handleSettleOffline}
              loading={isSettlingOffline}
            >
              Received Cash / UPI Payment
            </Button>
          </CardContent>
        </Card>
      )}

      {booking.status === "PAYMENT_SETTLED" && (
        <Card className="border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 p-4 rounded-2xl text-center font-semibold">
          🎉 Job Completed! Payment of ₹{booking.amount} has been successfully settled.
        </Card>
      )}

      <div className="flex gap-3">
        {(booking.status === "CREATED" || booking.status === "WORKER_ASSIGNED") && (
          <Button className="flex-1" size="lg" onClick={handleStartJourney} loading={isEnRouteLoading}>
            Start Journey
          </Button>
        )}
        {booking.status === "WORKER_EN_ROUTE" && (
          <Button className="flex-1" size="lg" onClick={handleVerifyOtp} loading={isVerifying}>
            Verify OTP & Start Job
          </Button>
        )}
        {booking.status === "WORK_STARTED" && (
          <Button className="flex-1" size="lg" onClick={handleComplete} loading={isCompleting}>
            Mark Completed
          </Button>
        )}
      </div>
    </div>
  );
}
