export function wrapEmailLayout(content: string, preheader: string = ""): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SHRAM Notification</title>
  <style>
    body {
      font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 32px 16px;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid #f1f5f9;
      overflow: hidden;
    }
    .header {
      background-color: #0f172a;
      padding: 24px;
      text-align: center;
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #f59e0b;
      text-decoration: none;
      text-transform: uppercase;
    }
    .content {
      padding: 32px 24px;
      line-height: 1.6;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background-color: #f59e0b;
      color: #ffffff !important;
      font-weight: 600;
      border-radius: 8px;
      text-decoration: none;
      margin-top: 16px;
      text-align: center;
    }
    .otp-box {
      background-color: #f1f5f9;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-code {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 0.1em;
      color: #0f172a;
    }
    h2 {
      margin-top: 0;
      color: #0f172a;
      font-size: 20px;
      font-weight: 700;
    }
    p {
      margin-top: 0;
      margin-bottom: 16px;
      font-size: 15px;
      color: #334155;
    }
    .accent {
      color: #f59e0b;
      font-weight: 600;
    }
  </style>
</head>
<body>
  ${preheader ? `<span style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;color:#f8fafc;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ""}
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="logo">⚡ SHRAM</span>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p style="margin-bottom: 8px; font-size: 12px; color: #64748b;">Connect with pre-verified workers instantly.</p>
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">© 2026 SHRAM Technologies Pvt Ltd. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
