import { wrapEmailLayout } from "./layout.js";

export const otpLoginTemplate = wrapEmailLayout(
  `<h2>Your Verification Code</h2>
  <p>Hello,</p>
  <p>Use the verification code below to complete your login or registration on <span class="accent">SHRAM</span>. This code is valid for <strong>{{expiryMinutes}}</strong> minutes.</p>
  <div class="otp-box">
    <div class="otp-code">{{otp}}</div>
  </div>
  <p style="font-size: 13px; color: #64748b;">If you did not request this code, please secure your account and ignore this email.</p>`,
  "Your SHRAM verification code is {{otp}}"
);
