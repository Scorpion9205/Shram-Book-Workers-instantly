import React from "react";

import { Layout, Header, Footer, Card, Text, Divider } from "../components/index.js";
import type { PasswordChangedProps } from "../types/email.types.js";

export default function PasswordChanged({ name, frontendUrl }: PasswordChangedProps) {
  return (
    <Layout>
      <Header frontendUrl={frontendUrl} />

      <Card>
        <h2 style={{ color: "#15803d", marginBottom: "20px", fontSize: "22px" }}>
          Password Changed Successfully
        </h2>

        <Text>
          Hello <strong>{name}</strong>,
        </Text>

        <Text>Your SHRAM account password has been changed successfully.</Text>

        <Text>If you made this change, no further action is required.</Text>

        <Divider />

        <Text>
          <strong>Didn't change your password?</strong>
        </Text>

        <Text>
          Your account may be compromised. Please contact SHRAM Support immediately and
          secure your account.
        </Text>
      </Card>

      <Footer frontendUrl={frontendUrl} />
    </Layout>
  );
}
