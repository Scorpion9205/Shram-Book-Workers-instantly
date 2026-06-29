import React from "react";

interface ButtonProps {
  href: string;
  children: React.ReactNode;
}

export function Button({
  href,
  children,
}: ButtonProps) {
  return (
    <a
      href={href}
      style={{
        display: "inline-block",
        background: "#2563eb",
        color: "#ffffff",
        textDecoration: "none",
        padding: "14px 24px",
        borderRadius: "8px",
        fontWeight: "bold",
      }}
    >
      {children}
    </a>
  );
}