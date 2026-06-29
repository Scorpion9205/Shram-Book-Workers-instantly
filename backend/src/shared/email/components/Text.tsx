import React from "react";

interface TextProps {
  children: React.ReactNode;
}

export function Text({
  children,
}: TextProps) {
  return (
    <p
      style={{
        color: "#374151",
        fontSize: "16px",
        lineHeight: "26px",
      }}
    >
      {children}
    </p>
  );
}