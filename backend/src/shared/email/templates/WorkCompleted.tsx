import React from "react";
import { Layout, Header, Footer, Card, Text, Divider, Button } from "../components/index.js";

interface WorkCompletedProps {
  providerName: string;
  workerName: string;
  bookingShortId: string;
  frontendUrl: string;
}

export function WorkCompleted({ providerName, workerName, bookingShortId, frontendUrl }: WorkCompletedProps) {
  return (
    <Layout>
      <Header />
      <Card>
        <h2 style={{ color: "#111827", marginBottom: "20px" }}>
          🛠️ Work Completed Alert
        </h2>
        <Text>
          Hello <strong>{providerName}</strong>,
        </Text>
        <Text>
          Worker <strong>{workerName}</strong> has marked the service for your booking <strong>#{bookingShortId}</strong> as completed.
        </Text>
        <Text>
          Please review the completed work. If everything is satisfactory, you can proceed to settle the payment from your dashboard.
        </Text>
        <Divider />
        <div style={{ textAlign: "center", margin: "24px 0" }}>
          <Button href={`${frontendUrl}/provider/bookings`}>
            Approve & Pay Invoice
          </Button>
        </div>
      </Card>
      <Footer />
    </Layout>
  );
}

export default WorkCompleted;
