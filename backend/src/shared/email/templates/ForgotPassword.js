import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Layout, Header, Footer, Card, Text, Button, Divider, } from "../components/index.js";
export default function ForgotPassword({ name, resetLink, }) {
    return (_jsxs(Layout, { children: [_jsx(Header, {}), _jsxs(Card, { children: [_jsx("h2", { style: {
                            color: "#111827",
                            marginBottom: "20px",
                        }, children: "\uD83D\uDD10 Reset Your Password" }), _jsxs(Text, { children: ["Hello ", _jsx("strong", { children: name }), ","] }), _jsx(Text, { children: "We received a request to reset your SHRAM account password." }), _jsx(Text, { children: "Click the button below to create a new password." }), _jsx("div", { style: {
                            textAlign: "center",
                            margin: "30px 0",
                        }, children: _jsx(Button, { href: resetLink, children: "Reset Password" }) }), _jsx(Divider, {}), _jsxs(Text, { children: ["This password reset link will expire in ", _jsx("strong", { children: "15 minutes" }), "."] }), _jsx(Text, { children: "If you didn't request a password reset, you can safely ignore this email." })] }), _jsx(Footer, {})] }));
}
//# sourceMappingURL=ForgotPassword.js.map