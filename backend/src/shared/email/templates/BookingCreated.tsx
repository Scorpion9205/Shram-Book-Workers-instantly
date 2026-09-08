import React from "react";
import { Layout, Header, Footer, Card, Text, Divider, Button } from "../components/index.js";

interface BookingCreatedProps {
  name: string;
  bookingId: string;
  frontendUrl: string;
}

export function BookingCreated({ name, bookingId, frontendUrl }: BookingCreatedProps) {
  return (
    <Layout>
      <Header />
      <Card>
        <h2 style={{ color: "#111827", marginBottom: "20px" }}>
          📝 Booking Created Successfully
        </h2>
        <Text>
          Hello <strong>{name}</strong>,
        </Text>
        <Text>
          Your service booking has been created successfully. We are currently matching your request with qualified nearby workers.
        </Text>
        <div style={{ background: "#f3f4f6", padding: "16px", borderRadius: "8px", margin: "20px 0" }}>
          <Text>
            <strong>Booking ID:</strong> <span style={{ fontFamily: "monospace" }}>{bookingId}</span>
          </Text>
          <Text>
            <strong>Status:</strong> Pending worker assignment
          </Text>
        </div>
        <Divider />
        <div style={{ textAlign: "center", margin: "24px 0" }}>
          <Button href={`${frontendUrl}/provider/bookings`}>
            View Booking Status
          </Button>
        </div>
        <Text>
          We will send you another notification once a worker accepts your booking.
        </Text>
      </Card>
      <Footer />
    </Layout>
  );
}

export default BookingCreated;
