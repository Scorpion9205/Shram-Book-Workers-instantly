import { LandingNavbar } from "@/components/layout/LandingNavbar";
import { LandingFooter } from "@/components/layout/LandingFooter";

export const metadata = {
  title: "Privacy Policy — SHRAM",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />

      <main className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: October 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Who we are</h2>
            <p className="mt-2">
              SHRAM ("we", "us", "our") operates a platform connecting Providers who need work done with
              Workers who perform it, mediated by Agents and governed by Admin oversight. This policy explains
              what personal data we collect, why, and how it is handled.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Information we collect</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Account details: name, phone number, email address, role (Provider/Worker/Agent), and profile photo.</li>
              <li>Verification data: OTP confirmation records and, for Workers, skill and experience details submitted for verification.</li>
              <li>Location data: precise latitude/longitude while a Worker is marked available, and addresses entered for jobs and instant requests.</li>
              <li>Booking and payment data: booking history, amounts, and payment status. Card and UPI details are handled directly by our payment processor (Razorpay) — we do not store full payment instrument details ourselves.</li>
              <li>Communications: messages sent through the in-app chat between a Provider and Worker on a shared booking, and support correspondence.</li>
              <li>Device and usage data: IP address, device/browser identifiers, and app usage logs, collected for security and fraud prevention.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. How we use this information</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>To create and verify your account via OTP, and to authenticate you on each login.</li>
              <li>To match Providers with nearby available Workers for Instant Requests and to display relevant Job postings.</li>
              <li>To calculate fares, process payments, and settle payouts to Workers.</li>
              <li>To enable in-app communication between the Provider and Worker on a booking.</li>
              <li>To send booking-related notifications (email, SMS, and push) — confirmations, status updates, OTPs, and receipts.</li>
              <li>To investigate disputes, enforce our Terms of Service, and prevent fraud or abuse of the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Sharing your information</h2>
            <p className="mt-2">We share data only as needed to operate the platform:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Between a Provider and the Worker assigned to their booking (name, phone number, and location relevant to that booking only).</li>
              <li>With our payment processor (Razorpay) to process payments and payouts.</li>
              <li>With our email, SMS, and push notification providers, solely to deliver the notifications described above.</li>
              <li>With law enforcement or regulators where required by applicable law.</li>
            </ul>
            <p className="mt-2">We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Data retention</h2>
            <p className="mt-2">
              We retain account and booking records for as long as your account is active and for a reasonable
              period afterward to meet legal, accounting, and dispute-resolution obligations. OTP codes are
              short-lived and are invalidated immediately after use or expiry.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Your choices</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>You can update your profile information at any time from your account settings.</li>
              <li>Workers can toggle their availability and live-location sharing off at any time.</li>
              <li>You may request deletion of your account by contacting support; some records may be retained where legally required.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Security</h2>
            <p className="mt-2">
              We use industry-standard measures to protect your data, including encrypted password/OTP storage,
              access controls, and secure transmission (HTTPS). No system is completely secure, and we encourage
              you to use a strong, unique password where applicable and to keep your login credentials private.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Changes to this policy</h2>
            <p className="mt-2">
              We may update this policy from time to time. Material changes will be notified through the app or
              via email before they take effect.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Contact us</h2>
            <p className="mt-2">
              For questions about this policy or your data, contact us through the support options available in
              the app.
            </p>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
