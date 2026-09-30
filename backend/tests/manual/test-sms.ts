// Manual smoke test — not part of the build or CI. Run with: tsx tests/manual/test-sms.ts <to-phone>
import dotenv from "dotenv";
dotenv.config();
import { ExotelProvider } from "../../src/infrastructure/providers/sms/ExotelProvider.js";

async function run() {
  const to = process.argv[2] ?? process.env.TEST_SMS_TO;
  if (!to) {
    console.error("Usage: tsx tests/manual/test-sms.ts <to-phone> (or set TEST_SMS_TO)");
    process.exit(1);
  }

  const provider = new ExotelProvider(
    process.env.EXOTEL_API_KEY,
    process.env.EXOTEL_API_TOKEN,
    process.env.EXOTEL_SID || process.env.EXOTEL_ACCOUNT_SID,
    process.env.EXOTEL_FROM || process.env.EXOTEL_SENDER_ID
  );

  try {
    console.log("Sending test SMS...");
    await provider.send(to, "Test verification code: 123456");
    console.log("SMS sent successfully!");
  } catch (err) {
    console.error("Test SMS failed:", err);
  }
}

run();
