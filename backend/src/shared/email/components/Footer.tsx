

interface FooterProps {
  frontendUrl: string;
}

export function Footer({ frontendUrl }: FooterProps) {
  return (
    <div
      style={{
        marginTop: "40px",
        borderTop: "1px solid #e4e4e7",
        paddingTop: "24px",
        textAlign: "center",
        color: "#9ca3af",
        fontSize: "13px",
        lineHeight: "20px",
      }}
    >
      <p style={{ margin: "0 0 4px" }}>
        <a href={frontendUrl} style={{ color: "#0f766e", textDecoration: "none", fontWeight: 600 }}>
          SHRAM
        </a>{" "}
        — connecting Providers with Workers, instantly.
      </p>
      <p style={{ margin: 0 }}>
        Questions? Reach us at{" "}
        <a href="mailto:support@theshram.co.in" style={{ color: "#9ca3af" }}>
          support@theshram.co.in
        </a>
      </p>
      <p style={{ margin: "12px 0 0", color: "#d4d4d8" }}>© {new Date().getFullYear()} SHRAM. All rights reserved.</p>
    </div>
  );
}
