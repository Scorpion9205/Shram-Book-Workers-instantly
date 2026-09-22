import React from "react";
import { Layout, Header, Footer, Card, Text, Divider, Button } from "../components/index.js";

interface BookingCancelledProps {
  bookingShortId: string;
  reason: string;
  frontendUrl: string;
}

export function BookingCancelled({ bookingShortId, reason, frontendUrl }: BookingCancelledProps) {
  return (
    <Layout>
      <Header />
      <Card>
        <h2 style={{ color: "#dc2626", marginBottom: "20px" }}>
          ❌ Booking Cancelled
        </h2>
        <Text>
          Your service booking <strong>#{bookingShortId}</strong> has been cancelled.
        </Text>
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", padding: "16px", borderRadius: "8px", margin: "20px 0" }}>
          <Text>
            <strong>Reason for Cancellation:</strong> {reason}
          </Text>
        </div>
        <Text>
          If any advance deposit was paid, the refund process will be initiated to your original payment source within 5-7 business days.
        </Text>
        <Divider />
        <div style={{ textAlign: "center", margin: "24px 0" }}>
          <Button href={frontendUrl}>
            Go to Dashboard
          </Button>
        </div>
      </Card>
      <Footer />
    </Layout>
  );
}

export default BookingCancelled;
