import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Layout, Header, Footer, Card, Text, Divider, } from "../components/index.js";
export default function PasswordChanged({ name, }) {
    return (_jsxs(Layout, { children: [_jsx(Header, {}), _jsxs(Card, { children: [_jsx("h2", { style: {
                            color: "#16a34a",
                            marginBottom: "20px",
                        }, children: "\u2705 Password Changed Successfully" }), _jsxs(Text, { children: ["Hello ", _jsx("strong", { children: name }), ","] }), _jsx(Text, { children: "Your SHRAM account password has been changed successfully." }), _jsx(Text, { children: "If you made this change, no further action is required." }), _jsx(Divider, {}), _jsx(Text, { children: _jsx("strong", { children: "Didn't change your password?" }) }), _jsx(Text, { children: "Your account may be compromised. Please contact SHRAM Support immediately and secure your account." })] }), _jsx(Footer, {})] }));
}
//# sourceMappingURL=PasswordChanged.js.map