import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({
  children,
}: LayoutProps) {
  return (
    <html>
      <body
        style={{
          margin: 0,
          padding: "40px 0",
          backgroundColor: "#f4f4f5",
          fontFamily:
            "Arial, Helvetica, sans-serif",
        }}
      >
        <table
          width="100%"
          cellPadding={0}
          cellSpacing={0}
        >
          <tbody>
            <tr>
              <td align="center">
                <table
                  width="600"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    background: "#ffffff",
                    borderRadius: "12px",
                    overflow: "hidden",
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          padding: "40px",
                        }}
                      >
                        {children}
                      </td>
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