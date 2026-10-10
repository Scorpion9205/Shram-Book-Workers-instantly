"use client";

import { use, useState, useEffect } from "react";
import { ArrowLeft, Phone, MapPin, Star, MessageCircle } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingTimeline } from "@/components/cards/BookingTimeline";
import { ReviewDialog } from "@/components/dialogs/ReviewDialog";
import { EmptyState } from "@/components/cards/EmptyState";
import { useGetBookingByIdQuery, useSettleBookingMutation, useCreatePaymentOrderMutation } from "@/features/booking/bookingApi";
import { useSocket } from "@/providers/SocketProvider";
import { useBookingLocationTracking } from "@/hooks/useBookingLocationTracking";
import { LiveTrackingMap } from "@/components/maps/LiveTrackingMap";
import { toast } from "sonner";

export default function ProviderBookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const { data: booking, isLoading, isError, refetch } = useGetBookingByIdQuery(bookingId);
  const [settleBooking, { isLoading: isSettling }] = useSettleBookingMutation();
  const [createPaymentOrder, { isLoading: isPaying }] = useCreatePaymentOrderMutation();
  const [reviewOpen, setReviewOpen] = useState(false);
  const { socket } = useSocket();
  const isWorkerEnRoute = booking?.status === "WORKER_EN_ROUTE";
  const workerPosition = useBookingLocationTracking(bookingId, isWorkerEnRoute);

  async function handleSettle() {
    try {
      await settleBooking(bookingId).unwrap();
      toast.success("Payment confirmed and released to worker!");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to settle payment.");
    }
  }

  function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function handleOnlinePayment() {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast.error("Failed to load Razorpay SDK. Check your network.");
      return;
    }

    try {
      const orderData = await createPaymentOrder(bookingId).unwrap();
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_U1bE9pYpZlZ1eW", // Razorpay test key ID
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Shram Bookings",
        description: `Payment for booking #${bookingId}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          toast.success("Payment captured successfully!");
          refetch();
        },
        prefill: {
          name: booking?.provider?.name || "",
          email: booking?.provider?.email || "",
          contact: booking?.provider?.phone || "",
        },
        theme: {
          color: "#4F46E5",
        },
        modal: {
          // Without this, closing the checkout (changed mind, wrong card, network blip)
          // leaves the Provider with no feedback and no obvious next step — the booking is
          // still payable (the backend now allows retrying from PAYMENT_PENDING), but nothing
          // told them that.
          ondismiss: () => {
            toast.info("Payment was not completed. You can try again whenever you're ready.");
            refetch();
          },
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to initiate online payment.");
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

      {booking.status !== "WORK_STARTED" && booking.status !== "WORK_COMPLETED" && booking.status !== "PAYMENT_SETTLED" && booking.status !== "REVIEWED" && booking.status !== "CLOSED" && booking.startOtp && (
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

            <div className="flex items-center gap-2">
              {booking.worker && (
                <Button asChild variant="outline" size="icon">
                  <Link href={`/provider/chat/${bookingId}`}>
                    <MessageCircle className="size-4" />
                  </Link>
                </Button>
              )}
              {booking.worker?.user?.phone && (
                <Button asChild variant="outline" size="icon">
                  <a href={`tel:${booking.worker.user.phone}`}>
                    <Phone className="size-4" />
                  </a>
                </Button>
              )}
            </div>

          </div>

        </CardContent>
      </Card>

      {isWorkerEnRoute ? (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Worker is on the way</CardTitle>
          </CardHeader>
          <CardContent>
            <LiveTrackingMap
              workerPosition={workerPosition}
              destination={
                booking.job?.latitude != null && booking.job?.longitude != null
                  ? { lat: booking.job.latitude, lng: booking.job.longitude }
                  : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" />
          Live map tracking will appear here once the worker is on the way.
        </Card>
      )}
      {booking.worker && (
        <div className="border-t pt-4 space-y-2">

          <h3 className="font-semibold">
            Assigned Worker
          </h3>

          <div className="flex items-center gap-4">

            <Avatar className="size-14">

              <AvatarImage
                src={booking.worker.user?.profileImage}
              />

              <AvatarFallback>
                {booking.worker.user?.name?.[0] || "W"}
              </AvatarFallback>

            </Avatar>

            <div className="flex-1">

              <p className="font-semibold">
                {booking.worker.user?.name}
              </p>

              <p className="text-sm text-muted-foreground">
                {booking.worker.user?.phone}
              </p>

              <div className="mt-2 flex gap-4 text-sm text-muted-foreground">

                <span>
                  ⭐ {booking.worker.rating}
                </span>

                <span>
                  {booking.worker.experience} yrs
                </span>

                <span>
                  {booking.worker.totalJobs} Jobs
                </span>

              </div>

            </div>

          </div>

        </div>
      )}
      {(booking.status === "CREATED" || booking.status === "PAYMENT_PENDING") && booking.paymentMode === "ONLINE" && (
        <Button className="w-full text-white bg-indigo-600 hover:bg-indigo-700" size="lg" onClick={handleOnlinePayment} loading={isPaying}>
          Pay Online (₹{booking.amount})
        </Button>
      )}
      {booking.status === "WORK_COMPLETED" && booking.paymentMode === "ONLINE" && (
        <Button className="w-full text-white bg-emerald-600 hover:bg-emerald-700" size="lg" onClick={handleSettle} loading={isSettling}>
          Confirm & Release Payment
        </Button>
      )}
      {booking.status === "WORK_COMPLETED" && booking.paymentMode !== "ONLINE" && (
        <Card className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          Waiting for the worker to confirm they've received the offline payment.
        </Card>
      )}
      {(booking.status === "WORK_COMPLETED" || booking.status === "PAYMENT_SETTLED") && !booking.review && (
        <Button className="w-full" size="lg" variant="outline" onClick={() => setReviewOpen(true)}>
          <Star className="size-4" /> Rate this Worker
        </Button>
      )}

      <ReviewDialog bookingId={bookingId} open={reviewOpen} onOpenChange={setReviewOpen} />
    </div>
  );
}
