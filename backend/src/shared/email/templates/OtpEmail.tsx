import React from "react";

import { Layout, Header, Footer, Card, Text, Divider } from "../components/index.js";
import type { OTPEmailProps } from "../types/email.types.js";

export default function OtpEmail({ name, otp, frontendUrl }: OTPEmailProps) {
  return (
    <Layout>
      <Header frontendUrl={frontendUrl} />

      <Card>
        <h2 style={{ color: "#0f766e", marginBottom: "20px", fontSize: "22px" }}>
          Verify Your Account
        </h2>

        <Text>
          Hello <strong>{name}</strong>,
        </Text>

        <Text>Use the verification code below to continue.</Text>

        <div
          style={{
            textAlign: "center",
            margin: "30px 0",
            background: "#f0fdfa",
            border: "1px solid #99f6e4",
            borderRadius: "10px",
            padding: "20px",
          }}
        >
          <span
            style={{
              letterSpacing: "8px",
              fontSize: "38px",
              fontWeight: 700,
              color: "#0f766e",
            }}
          >
            {otp}
          </span>
        </div>

        <Divider />

        <Text>
          This OTP is valid for <strong>5 minutes</strong>.
        </Text>

        <Text>Never share this code with anyone.</Text>
      </Card>

      <Footer frontendUrl={frontendUrl} />
    </Layout>
  );
}
