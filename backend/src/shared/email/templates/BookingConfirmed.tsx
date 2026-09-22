import React from "react";
import { Layout, Header, Footer, Card, Text, Divider, Button } from "../components/index.js";

interface BookingConfirmedProps {
  providerName: string;
  bookingShortId: string;
  workerName: string;
  frontendUrl: string;
}

export function BookingConfirmed({ providerName, bookingShortId, workerName, frontendUrl }: BookingConfirmedProps) {
  return (
    <Layout>
      <Header />
      <Card>
        <h2 style={{ color: "#111827", marginBottom: "20px" }}>
          ✅ Booking Confirmed!
        </h2>
        <Text>
          Hello <strong>{providerName}</strong>,
        </Text>
        <Text>
          Good news! Your booking has been accepted and a worker is assigned to your job.
        </Text>
        <div style={{ background: "#f3f4f6", padding: "16px", borderRadius: "8px", margin: "20px 0" }}>
          <Text>
            <strong>Assigned Worker:</strong> {workerName}
          </Text>
          <Text>
            <strong>Booking ID:</strong> <span style={{ fontFamily: "monospace" }}>{bookingShortId}</span>
          </Text>
        </div>
        <Text>
          You can track the worker's live location and view contact details on your dashboard.
        </Text>
        <Divider />
        <div style={{ textAlign: "center", margin: "24px 0" }}>
          <Button href={`${frontendUrl}/provider/bookings`}>
            Track Worker Arrival
          </Button>
        </div>
      </Card>
      <Footer />
    </Layout>
  );
}

export default BookingConfirmed;
