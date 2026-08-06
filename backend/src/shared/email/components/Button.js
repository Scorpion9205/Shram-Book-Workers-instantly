import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
export function Button({ href, children, }) {
    return (_jsx("a", { href: href, style: {
            display: "inline-block",
            background: "#2563eb",
            color: "#ffffff",
            textDecoration: "none",
            padding: "14px 24px",
            borderRadius: "8px",
            fontWeight: "bold",
        }, children: children }));
}
//# sourceMappingURL=Button.js.map