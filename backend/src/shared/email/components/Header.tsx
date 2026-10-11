import React from "react";

interface HeaderProps {
  frontendUrl: string;
}

export function Header({ frontendUrl }: HeaderProps) {
  return (
    <div style={{ textAlign: "center", marginBottom: "32px" }}>
      <img
        src={`${frontendUrl}/logo.png`}
        alt="SHRAM"
        width={40}
        height={40}
        style={{ display: "block", margin: "0 auto 12px", borderRadius: "8px" }}
      />
      <p
        style={{
          color: "#9ca3af",
          fontSize: "13px",
          fontWeight: 600,
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          margin: 0,
        }}
      >
        Book Workers Instantly
      </p>
    </div>
  );
}
