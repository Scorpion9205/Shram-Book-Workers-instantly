import dotenv from "dotenv";
dotenv.config();
import { ExotelProvider } from "./infrastructure/providers/sms/ExotelProvider.js";

async function run() {
  const provider = new ExotelProvider(
    process.env.EXOTEL_API_KEY,
    process.env.EXOTEL_API_TOKEN,
    process.env.EXOTEL_SID || process.env.EXOTEL_ACCOUNT_SID,
    process.env.EXOTEL_FROM || process.env.EXOTEL_SENDER_ID
  );
  
  try {
    console.log("Sending test SMS...");
    await provider.send("9205102804", "Test verification code: 123456");
    console.log("SMS sent successfully!");
  } catch (err) {
    console.error("Test SMS failed:", err);
  }
}

run();
