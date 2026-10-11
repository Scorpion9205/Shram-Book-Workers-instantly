import React from "react";
import { Layout, Header, Footer, Card, Text, Divider, Button } from "../components/index.js";

interface PaymentReceiptProps {
  providerName: string;
  bookingShortId: string;
  workerName: string;
  amount: string;
  frontendUrl: string;
}

export function PaymentReceipt({ providerName, bookingShortId, workerName, amount, frontendUrl }: PaymentReceiptProps) {
  return (
    <Layout>
      <Header frontendUrl={frontendUrl} />
      <Card>
        <h2 style={{ color: "#18181b", marginBottom: "20px", fontSize: "22px" }}>
          Payment Receipt
        </h2>
        <Text>
          Hello <strong>{providerName}</strong>,
        </Text>
        <Text>
          Thank you for using SHRAM! We have received your payment. Here is the transaction details for booking <strong>#{bookingShortId}</strong>.
        </Text>
        <div style={{ background: "#f3f4f6", padding: "16px", borderRadius: "8px", margin: "20px 0" }}>
          <Text>
            <strong>Booking ID:</strong> <span style={{ fontFamily: "monospace" }}>{bookingShortId}</span>
          </Text>
          <Text>
            <strong>Assigned Worker:</strong> {workerName}
          </Text>
          <Text>
            <strong>Amount Settled:</strong> ₹{amount}
          </Text>
        </div>
        <Divider />
        <div style={{ textAlign: "center", margin: "24px 0" }}>
          <Button href={`${frontendUrl}/provider/bookings`}>
            Rate & Review Worker
          </Button>
        </div>
      </Card>
      <Footer frontendUrl={frontendUrl} />
    </Layout>
  );
}

export default PaymentReceipt;
