import React from "react";

interface CardProps {
  children: React.ReactNode;
}

export function Card({
  children,
}: CardProps) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "24px",
        background: "#fafafa",
      }}
    >
      {children}
    </div>
  );
}