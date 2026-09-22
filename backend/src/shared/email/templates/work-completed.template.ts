import { wrapEmailLayout } from "./layout.js";

export const workCompletedTemplate = wrapEmailLayout(
  `<h2>Work Completed</h2>
  <p>Hi {{providerName}},</p>
  <p>The worker <span class="accent">{{workerName}}</span> has marked the work for your booking <span class="accent">#{{bookingShortId}}</span> as completed.</p>
  <p>Please review and verify the service. If everything is in order, proceed to settle the payment from your provider dashboard.</p>
  <div style="text-align: center;">
    <a href="{{frontendUrl}}/provider/bookings" class="btn" style="color: #ffffff !important;">Approve & Pay</a>
  </div>`,
  "SHRAM: Work completed for booking #{{bookingShortId}}"
);
