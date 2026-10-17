import React from "react";
import { Layout, Header, Footer, Card, Text, Divider, Button } from "../components/index.js";

interface BookingCreatedProps {
  name: string;
  bookingId: string;
  // Set when a worker is already attached to the booking (instant requests, agent assignments,
  // direct bookings); empty while we are still looking for one.
  workerName?: string;
  // When the work is scheduled for, already formatted (e.g. "20 Oct 2026, 10:00 am"). Empty = ASAP.
  scheduledFor?: string;
  frontendUrl: string;
}

export function BookingCreated({ name, bookingId, workerName, scheduledFor, frontendUrl }: BookingCreatedProps) {
  const hasWorker = Boolean(workerName);
  return (
    <Layout>
      <Header frontendUrl={frontendUrl} />
      <Card>
        <h2 style={{ color: "#18181b", marginBottom: "20px", fontSize: "22px" }}>
          Booking Created Successfully
        </h2>
        <Text>
          Hello <strong>{name}</strong>,
        </Text>
        <Text>
          {hasWorker
            ? "Your booking has been created and a worker has been assigned to it."
            : "Your service booking has been created successfully. We are currently matching your request with qualified nearby workers."}
        </Text>
        <div style={{ background: "#f3f4f6", padding: "16px", borderRadius: "8px", margin: "20px 0" }}>
          <Text>
            <strong>Booking ID:</strong> <span style={{ fontFamily: "monospace" }}>#{bookingId}</span>
          </Text>
          {scheduledFor && (
            <Text>
              <strong>Scheduled for:</strong> {scheduledFor}
            </Text>
          )}
          <Text>
            {hasWorker ? (
              <>
                <strong>Assigned worker:</strong> {workerName}
              </>
            ) : (
              <>
                <strong>Status:</strong> Pending worker assignment
              </>
            )}
          </Text>
        </div>
        <Divider />
        <div style={{ textAlign: "center", margin: "24px 0" }}>
          <Button href={`${frontendUrl}/provider/bookings`}>View Booking Status</Button>
        </div>
        <Text>
          {hasWorker
            ? "You can see the worker's details and your start code on the booking page."
            : "We will send you another notification once a worker accepts your booking."}
        </Text>
      </Card>
      <Footer frontendUrl={frontendUrl} />
    </Layout>
  );
}

export default BookingCreated;
