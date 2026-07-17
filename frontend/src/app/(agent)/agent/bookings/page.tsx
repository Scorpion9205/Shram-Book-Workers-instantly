"use client";

import { CalendarCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/cards/EmptyState";
import { ListSkeleton } from "@/components/loaders/Skeletons";
import { useGetAgentBookingsQuery } from "@/features/agent/agentApi";

export default function AgentBookingsPage() {
  const { data = [], isLoading } = useGetAgentBookingsQuery();

  if (isLoading) return <ListSkeleton count={4} />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground">Agency bookings and assigned jobs.</p>
      </div>

      {!data.length ? (
        <EmptyState icon={CalendarCheck} title="No bookings yet" description="Accepted agency work will appear here." />
      ) : (
        <div className="space-y-3">
          {data.map((booking) => (
            <Card key={booking.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{booking.job?.title ?? "Booking"}</p>
                  <p className="text-sm text-muted-foreground">Amount: Rs {booking.amount}</p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {booking.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
