import React from "react";

interface ButtonProps {
  href: string;
  children: React.ReactNode;
}

export function Button({ href, children }: ButtonProps) {
  return (
    <a
      href={href}
      style={{
        display: "inline-block",
        background: "#0f766e",
        color: "#ffffff",
        textDecoration: "none",
        padding: "14px 28px",
        borderRadius: "8px",
        fontWeight: 600,
        fontSize: "15px",
      }}
    >
      {children}
    </a>
  );
}
