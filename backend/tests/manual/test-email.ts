// Manual smoke test — not part of the build or CI. Run with: tsx tests/manual/test-email.ts <to-email>
import dotenv from "dotenv";
dotenv.config();
import { ResendProvider } from "../../src/infrastructure/providers/email/ResendProvider.js";

async function run() {
  const to = process.argv[2] ?? process.env.TEST_EMAIL_TO;
  if (!to) {
    console.error("Usage: tsx tests/manual/test-email.ts <to-email> (or set TEST_EMAIL_TO)");
    process.exit(1);
  }

  const provider = new ResendProvider(
    process.env.RESEND_API_KEY,
    process.env.EMAIL_FROM || "noreply@shram.in"
  );

  try {
    console.log("Sending test Email...");
    await provider.send(to, "Test Verification", "Your SHRAM verification code is 123456");
    console.log("Email sent successfully!");
  } catch (err) {
    console.error("Test Email failed:", err);
  }
}

run();
