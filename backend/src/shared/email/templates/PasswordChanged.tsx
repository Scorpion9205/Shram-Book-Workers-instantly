import React from "react";

import {
  Layout,
  Header,
  Footer,
  Card,
  Text,
  Divider,
} from "../components/index.js";

interface PasswordChangedProps {
  name: string;
}

export default function PasswordChanged({
  name,
}: PasswordChangedProps) {

  return (

    <Layout>

      <Header />

      <Card>

        <h2
          style={{
            color: "#16a34a",
            marginBottom: "20px",
          }}
        >
          ✅ Password Changed Successfully
        </h2>

        <Text>
          Hello <strong>{name}</strong>,
        </Text>

        <Text>
          Your SHRAM account password has been
          changed successfully.
        </Text>

        <Text>
          If you made this change,
          no further action is required.
        </Text>

        <Divider />

        <Text>
          <strong>Didn't change your password?</strong>
        </Text>

        <Text>
          Your account may be compromised.
          Please contact SHRAM Support
          immediately and secure your account.
        </Text>

      </Card>

      <Footer />

    </Layout>

  );

}