import React from "react";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface WelcomeEmailProps {
  name: string;
  frontendUrl: string;
}

export interface ForgotPasswordEmailProps {
  name: string;
  resetLink: string;
  frontendUrl: string;
}

export interface OTPEmailProps {
  name: string;
  otp: string;
  frontendUrl: string;
}

export interface BookingConfirmedEmailProps {
  name: string;
  bookingId: string;
}

export interface EmailTemplateProps {
  children: React.ReactNode;
}

export interface PasswordChangedProps {
  name: string;
  frontendUrl: string;
}