import React from "react";
import type{ ForgotPasswordEmailProps } from "../types/email.types.js";
import {
  Layout,
  Header,
  Footer,
  Card,
  Text,
  Button,
  Divider,
} from "../components/index.js";



export default function ForgotPassword({
  name,
  resetLink,
}: ForgotPasswordEmailProps) {
  return (
    <Layout>

      <Header />

      <Card>

        <h2
          style={{
            color: "#111827",
            marginBottom: "20px",
          }}
        >
          🔐 Reset Your Password
        </h2>

        <Text>
          Hello <strong>{name}</strong>,
        </Text>

        <Text>
          We received a request to reset your
          SHRAM account password.
        </Text>

        <Text>
          Click the button below to create a
          new password.
        </Text>

        <div
          style={{
            textAlign: "center",
            margin: "30px 0",
          }}
        >
          <Button href={resetLink}>
            Reset Password
          </Button>
        </div>

        <Divider />

        <Text>
          This password reset link will expire
          in <strong>15 minutes</strong>.
        </Text>

        <Text>
          If you didn't request a password
          reset, you can safely ignore this
          email.
        </Text>

      </Card>

      <Footer />

    </Layout>
  );
}
