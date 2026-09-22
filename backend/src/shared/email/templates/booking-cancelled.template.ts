import { wrapEmailLayout } from "./layout.js";

export const bookingCancelledTemplate = wrapEmailLayout(
  `<h2>Booking Cancelled</h2>
  <p>Hello,</p>
  <p>Your booking <span class="accent">#{{bookingShortId}}</span> has been cancelled.</p>
  <div class="otp-box" style="text-align: left; padding: 16px;">
    <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Booking ID:</strong> <span style="font-family: monospace;">{{bookingShortId}}</span></p>
    <p style="margin: 0; font-size: 14px;"><strong>Reason:</strong> {{reason}}</p>
  </div>
  <p>If you were charged any deposit, the refund will be initiated back to your original source of payment within 5-7 business days.</p>
  <div style="text-align: center;">
    <a href="{{frontendUrl}}" class="btn" style="color: #ffffff !important;">Back to Dashboard</a>
  </div>`,
  "SHRAM Booking #{{bookingShortId}} has been Cancelled"
);
