import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Layout, Header, Footer, Card, Text, Button, Divider, } from "../components/index.js";
export function WelcomeEmail({ name, }) {
    return (_jsxs(Layout, { children: [_jsx(Header, {}), _jsxs(Card, { children: [_jsxs("h2", { style: {
                            color: "#111827",
                            marginBottom: "20px",
                        }, children: ["Welcome, ", name] }), _jsxs(Text, { children: ["Thank you for joining ", _jsx("strong", { children: "SHRAM" }), "."] }), _jsx(Text, { children: "We are excited to have you with us. SHRAM helps providers find skilled workers instantly and enables workers to discover nearby jobs with ease." }), _jsx(Divider, {}), _jsx(Text, { children: "Your account has been created successfully. You can now log in and start exploring jobs, instant requests, and bookings." }), _jsx("div", { style: {
                            textAlign: "center",
                            marginTop: "32px",
                            marginBottom: "32px",
                        }, children: _jsx(Button, { href: `${process.env.FRONTEND_URL}/login`, children: "Login to SHRAM" }) }), _jsx(Divider, {}), _jsx(Text, { children: "If you did not create this account, please ignore this email or contact our support team immediately." })] }), _jsx(Footer, {})] }));
}
export default WelcomeEmail;
//# sourceMappingURL=Welcome.js.map