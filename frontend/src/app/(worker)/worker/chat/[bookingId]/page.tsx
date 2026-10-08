"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/cards/EmptyState";
import { ChatThread } from "@/components/chat/ChatThread";
import { useGetBookingByIdQuery } from "@/features/booking/bookingApi";

export default function WorkerChatPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const { data: booking, isLoading, isError } = useGetBookingByIdQuery(bookingId);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/worker/booking/${bookingId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold text-foreground">Chat</h1>
      </div>

      {isLoading ? (
        <Skeleton className="h-[70vh] w-full" />
      ) : isError || !booking ? (
        <EmptyState title="Booking not found" description="This booking could not be loaded." />
      ) : !booking.provider ? (
        <EmptyState title="Provider unavailable" description="This booking has no provider information." />
      ) : (
        <ChatThread
          bookingId={bookingId}
          otherPartyName={booking.provider.name}
          otherPartyImage={booking.provider.profileImage}
        />
      )}
    </div>
  );
}
