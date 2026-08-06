import React from "react";
export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}
export interface WelcomeEmailProps {
    name: string;
}
export interface ForgotPasswordEmailProps {
    name: string;
    resetLink: string;
}
export interface OTPEmailProps {
    name: string;
    otp: string;
}
export interface BookingConfirmedEmailProps {
    name: string;
    bookingId: string;
}
export interface EmailTemplateProps {
    children: React.ReactNode;
}
export interface ForgotPasswordEmailProps {
    name: string;
    resetLink: string;
}
export interface PasswordChangedProps {
    name: string;
}
//# sourceMappingURL=email.types.d.ts.map