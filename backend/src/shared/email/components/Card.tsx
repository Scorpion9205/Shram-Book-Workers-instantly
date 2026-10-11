import React from "react";

interface CardProps {
  children: React.ReactNode;
}

export function Card({ children }: CardProps) {
  return (
    <div
      style={{
        border: "1px solid #e4e4e7",
        borderRadius: "12px",
        padding: "28px 24px",
        background: "#ffffff",
      }}
    >
      {children}
    </div>
  );
}
