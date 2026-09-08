import dotenv from "dotenv";
dotenv.config();
import { ResendProvider } from "./infrastructure/providers/email/ResendProvider.js";

async function run() {
  const provider = new ResendProvider(
    process.env.RESEND_API_KEY,
    process.env.EMAIL_FROM || "noreply@shram.in"
  );
  
  try {
    console.log("Sending test Email...");
    await provider.send("satyapaltiwari.cse@gmail.com", "Test Verification", "Your SHRAM verification code is 123456");
    console.log("Email sent successfully!");
  } catch (err) {
    console.error("Test Email failed:", err);
  }
}

run();
