import { wrapEmailLayout } from "./layout.js";

export const bookingConfirmedTemplate = wrapEmailLayout(
  `<h2>Booking Confirmed!</h2>
  <p>Hi {{providerName}},</p>
  <p>Good news! Your booking <span class="accent">#{{bookingShortId}}</span> has been confirmed. A worker has accepted your request and is assigned to your job.</p>
  <div class="otp-box" style="text-align: left; padding: 16px;">
    <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Assigned Worker:</strong> {{workerName}}</p>
    <p style="margin: 0; font-size: 14px;"><strong>Booking ID:</strong> <span style="font-family: monospace;">{{bookingShortId}}</span></p>
  </div>
  <p>You can contact the worker or view live arrival tracking through your provider dashboard panel.</p>
  <div style="text-align: center;">
    <a href="{{frontendUrl}}/provider/bookings" class="btn" style="color: #ffffff !important;">Track Worker</a>
  </div>`,
  "SHRAM Booking #{{bookingShortId}} is Confirmed"
);
