import React from "react";

import {

  Layout,

  Header,

  Footer,

  Card,

  Text,

  Divider,

} from "../components/index.js";

interface OTPEmailProps {

  name: string;

  otp: string;

}

export default function OtpEmail({

  name,

  otp,

}: OTPEmailProps) {

  return (

    <Layout>

      <Header />

      <Card>

        <h2
          style={{
            color: "#2563eb",
            marginBottom: "20px",
          }}
        >
          🔐 Verify Your Account
        </h2>

        <Text>

          Hello <strong>{name}</strong>,

        </Text>

        <Text>

          Use the verification code below
          to continue.

        </Text>

        <div
          style={{
            textAlign: "center",
            margin: "30px 0",
          }}
        >

          <h1
            style={{
              letterSpacing: "8px",
              fontSize: "42px",
              color: "#2563eb",
            }}
          >

            {otp}

          </h1>

        </div>

        <Divider />

        <Text>

          This OTP is valid for
          <strong> 5 minutes </strong>.

        </Text>

        <Text>

          Never share this code
          with anyone.

        </Text>

      </Card>

      <Footer />

    </Layout>

  );

}