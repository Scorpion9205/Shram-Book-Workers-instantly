import { wrapEmailLayout } from "./layout.js";

export const paymentReceiptTemplate = wrapEmailLayout(
  `<h2>Payment Receipt</h2>
  <p>Hi {{providerName}},</p>
  <p>Thank you for your payment. Here is your receipt details for booking <span class="accent">#{{bookingShortId}}</span>.</p>
  <div class="otp-box" style="text-align: left; padding: 16px;">
    <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Booking ID:</strong> <span style="font-family: monospace;">{{bookingShortId}}</span></p>
    <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Worker:</strong> {{workerName}}</p>
    <p style="margin: 0; font-size: 14px;"><strong>Amount Paid:</strong> ₹{{amount}}</p>
  </div>
  <p>If you have any feedback regarding your service experience, please review the worker inside the booking details page.</p>
  <div style="text-align: center;">
    <a href="{{frontendUrl}}/provider/bookings" class="btn" style="color: #ffffff !important;">Leave a Review</a>
  </div>`,
  "Receipt for SHRAM Booking #{{bookingShortId}}"
);
