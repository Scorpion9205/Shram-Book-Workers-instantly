import React from "react";

interface TextProps {
  children: React.ReactNode;
}

export function Text({ children }: TextProps) {
  return (
    <p
      style={{
        color: "#3f3f46",
        fontSize: "15px",
        lineHeight: "24px",
        margin: "0 0 16px",
      }}
    >
      {children}
    </p>
  );
}
