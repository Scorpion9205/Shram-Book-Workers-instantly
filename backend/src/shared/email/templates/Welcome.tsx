import React from "react";

import { Layout, Header, Footer, Card, Text, Button, Divider } from "../components/index.js";

import type { WelcomeEmailProps } from "../types/email.types.js";

export function WelcomeEmail({ name, frontendUrl }: WelcomeEmailProps) {
  return (
    <Layout>
      <Header frontendUrl={frontendUrl} />

      <Card>
        <h2 style={{ color: "#18181b", marginBottom: "20px", fontSize: "22px" }}>
          Welcome, {name} 👋
        </h2>

        <Text>
          Thank you for joining <strong>SHRAM</strong>.
        </Text>

        <Text>
          We're excited to have you with us. SHRAM helps providers find skilled workers
          instantly, and enables workers to discover nearby jobs with ease.
        </Text>

        <Divider />

        <Text>
          Your account has been created successfully. You can now log in and start
          exploring jobs, instant requests, and bookings.
        </Text>

        <div style={{ textAlign: "center", marginTop: "32px", marginBottom: "32px" }}>
          <Button href={`${frontendUrl}/login`}>Login to SHRAM</Button>
        </div>

        <Divider />

        <Text>
          If you did not create this account, please ignore this email or contact our
          support team immediately.
        </Text>
      </Card>

      <Footer frontendUrl={frontendUrl} />
    </Layout>
  );
}

export default WelcomeEmail;
