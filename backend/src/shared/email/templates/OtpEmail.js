import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Layout, Header, Footer, Card, Text, Divider, } from "../components/index.js";
export default function OtpEmail({ name, otp, }) {
    return (_jsxs(Layout, { children: [_jsx(Header, {}), _jsxs(Card, { children: [_jsx("h2", { style: {
                            color: "#2563eb",
                            marginBottom: "20px",
                        }, children: "\uD83D\uDD10 Verify Your Account" }), _jsxs(Text, { children: ["Hello ", _jsx("strong", { children: name }), ","] }), _jsx(Text, { children: "Use the verification code below to continue." }), _jsx("div", { style: {
                            textAlign: "center",
                            margin: "30px 0",
                        }, children: _jsx("h1", { style: {
                                letterSpacing: "8px",
                                fontSize: "42px",
                                color: "#2563eb",
                            }, children: otp }) }), _jsx(Divider, {}), _jsxs(Text, { children: ["This OTP is valid for", _jsx("strong", { children: " 5 minutes " }), "."] }), _jsx(Text, { children: "Never share this code with anyone." })] }), _jsx(Footer, {})] }));
}
//# sourceMappingURL=OtpEmail.js.map