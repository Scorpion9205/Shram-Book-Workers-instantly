import React from "react";
import { Layout, Header, Footer, Card, Text, Divider, Button } from "../components/index.js";

interface WorkStartedProps {
  providerName: string;
  workerName: string;
  bookingShortId: string;
  frontendUrl: string;
}

// Sent to the provider once the worker has entered the start OTP and begun the job.
export function WorkStarted({ providerName, workerName, bookingShortId, frontendUrl }: WorkStartedProps) {
  return (
    <Layout>
      <Header frontendUrl={frontendUrl} />
      <Card>
        <h2 style={{ color: "#18181b", marginBottom: "20px", fontSize: "22px" }}>Work Has Started</h2>
        <Text>
          Hello <strong>{providerName}</strong>,
        </Text>
        <Text>
          {workerName ? <strong>{workerName}</strong> : "Your worker"} has verified the start code and begun the
          work for booking <strong>#{bookingShortId}</strong>.
        </Text>
        <Text>We'll let you know as soon as the job is marked as completed.</Text>
        <Divider />
        <div style={{ textAlign: "center", margin: "24px 0" }}>
          <Button href={`${frontendUrl}/provider/bookings`}>View Booking</Button>
        </div>
      </Card>
      <Footer frontendUrl={frontendUrl} />
    </Layout>
  );
}

export default WorkStarted;
