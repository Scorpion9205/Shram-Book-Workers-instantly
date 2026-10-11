import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <html>
      <body
        style={{
          margin: 0,
          padding: "40px 16px",
          backgroundColor: "#f4f4f5",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
        }}
      >
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td align="center">
                <table
                  width="600"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    maxWidth: "600px",
                    width: "100%",
                    background: "#ffffff",
                    borderRadius: "16px",
                    overflow: "hidden",
                    border: "1px solid #e4e4e7",
                  }}
                >
                  <tbody>
                    {/* Thin brand bar — a small, email-client-safe way to reinforce the brand
                        without relying on background images or web fonts. */}
                    <tr>
                      <td style={{ height: "4px", background: "#0f766e", fontSize: 0, lineHeight: 0 }}>
                        &nbsp;
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "40px" }}>{children}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
