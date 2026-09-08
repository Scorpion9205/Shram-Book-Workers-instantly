import { wrapEmailLayout } from "./layout.js";

export const welcomeTemplate = wrapEmailLayout(
  `<h2>Welcome to SHRAM, {{name}}! 🎉</h2>
  <p>We are thrilled to have you join our marketplace community.</p>
  <p>SHRAM connects service providers with pre-verified workers instantly. Whether you are looking to hire helper assistance, plumbers, electricians, or looking to apply for local jobs, we are here to streamline the matching experience.</p>
  <p>To get started, update your profile options in your dashboard and post your first job request.</p>
  <div style="text-align: center;">
    <a href="{{frontendUrl}}" class="btn" style="color: #ffffff !important;">Go to Dashboard</a>
  </div>`,
  "Welcome to SHRAM!"
);
