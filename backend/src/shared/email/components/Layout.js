import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
export function Layout({ children, }) {
    return (_jsx("html", { children: _jsx("body", { style: {
                margin: 0,
                padding: "40px 0",
                backgroundColor: "#f4f4f5",
                fontFamily: "Arial, Helvetica, sans-serif",
            }, children: _jsx("table", { width: "100%", cellPadding: 0, cellSpacing: 0, children: _jsx("tbody", { children: _jsx("tr", { children: _jsx("td", { align: "center", children: _jsx("table", { width: "600", cellPadding: 0, cellSpacing: 0, style: {
                                    background: "#ffffff",
                                    borderRadius: "12px",
                                    overflow: "hidden",
                                }, children: _jsx("tbody", { children: _jsx("tr", { children: _jsx("td", { style: {
                                                padding: "40px",
                                            }, children: children }) }) }) }) }) }) }) }) }) }));
}
//# sourceMappingURL=Layout.js.map