import { wrapEmailLayout } from "./layout.js";

export const bookingCreatedTemplate = wrapEmailLayout(
  `<h2>Booking Created Successfully</h2>
  <p>Hi {{name}},</p>
  <p>Your request has been registered and a booking has been created successfully.</p>
  <div class="otp-box" style="text-align: left; padding: 16px;">
    <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Booking ID:</strong> <span style="font-family: monospace;">{{bookingId}}</span></p>
    <p style="margin: 0; font-size: 14px;"><strong>Status:</strong> Pending Worker Matching / Assignment</p>
  </div>
  <p>We are matching your request with qualified nearby workers. We will notify you once a worker accepts your booking.</p>
  <div style="text-align: center;">
    <a href="{{frontendUrl}}/provider/bookings" class="btn" style="color: #ffffff !important;">Track Booking</a>
  </div>`,
  "Your SHRAM booking #{{bookingId}} has been created"
);
