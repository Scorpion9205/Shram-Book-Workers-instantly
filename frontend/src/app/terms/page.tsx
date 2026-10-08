import { LandingNavbar } from "@/components/layout/LandingNavbar";
import { LandingFooter } from "@/components/layout/LandingFooter";

export const metadata = {
  title: "Terms of Service — SHRAM",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />

      <main className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: October 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of terms</h2>
            <p className="mt-2">
              By creating an account or using SHRAM, you agree to these Terms of Service. If you do not agree,
              please do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. What SHRAM is and isn't</h2>
            <p className="mt-2">
              SHRAM is a marketplace that connects Providers (who need work done) with Workers (who perform
              it), optionally through Agents. SHRAM facilitates discovery, booking, in-app communication, and
              payment for these services. SHRAM is not the employer of any Worker and is not a party to the
              work agreement between a Provider and a Worker, except where explicitly stated for payment
              processing and dispute mediation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Accounts and verification</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>You must provide accurate information when registering and verify your account via OTP.</li>
              <li>You are responsible for keeping your account credentials confidential and for all activity under your account.</li>
              <li>SHRAM may suspend or terminate accounts that provide false information, violate these terms, or are used fraudulently.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Bookings, pricing, and payments</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Fares shown to a Provider are calculated by SHRAM based on factors including base skill rate, distance, demand, and admin-configured platform rules. The final fare is determined by the platform, not negotiated directly outside it (except where Instant Bidding is explicitly used).</li>
              <li>Online payments are processed through Razorpay. A work-start OTP is used to confirm the Worker has arrived before work begins; the Provider shares this code with the Worker in person.</li>
              <li>Platform commission is deducted from the amount paid before it is credited to the Worker's in-app wallet, at the rate configured by SHRAM at the time of the booking.</li>
              <li>Cancellations are governed by the booking status at the time of cancellation; a Provider may cancel an open, unaccepted Instant Request at any time before a Worker accepts it.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Conduct</h2>
            <p className="mt-2">You agree not to:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Use the platform for any unlawful purpose, or to harass, threaten, or discriminate against another user.</li>
              <li>Circumvent the platform's payment or booking flow (e.g. arranging payment outside the app to avoid commission) where doing so breaches agreed platform rules.</li>
              <li>Misrepresent your identity, skills, or qualifications.</li>
              <li>Attempt to interfere with the security or normal operation of the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Reviews</h2>
            <p className="mt-2">
              Providers and Workers may review each other after a booking is completed. Reviews must be honest
              and can be edited within 5 minutes of submission, after which they are locked. SHRAM may remove
              reviews that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Disputes</h2>
            <p className="mt-2">
              If a dispute arises between a Provider and a Worker regarding a booking, SHRAM Admin may review
              booking records, chat history, and payment status to help mediate. SHRAM's decision on
              platform-related matters (such as payment holds for a disputed booking) is final for the purposes
              of using the platform, without prejudice to either party's other legal rights.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Limitation of liability</h2>
            <p className="mt-2">
              SHRAM provides the platform on an "as is" basis. To the maximum extent permitted by law, SHRAM is
              not liable for the quality of work performed by a Worker, the conduct of any user, or indirect or
              consequential losses arising from use of the platform. Nothing in these terms limits liability
              that cannot be excluded under applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Termination</h2>
            <p className="mt-2">
              You may stop using SHRAM and request account closure at any time. SHRAM may suspend or terminate
              access for violation of these terms, fraudulent activity, or at its reasonable discretion to
              protect the platform and its users.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Changes to these terms</h2>
            <p className="mt-2">
              We may update these terms from time to time. Continued use of the platform after an update
              constitutes acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">11. Contact</h2>
            <p className="mt-2">
              For questions about these terms, contact us through the support options available in the app.
            </p>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
