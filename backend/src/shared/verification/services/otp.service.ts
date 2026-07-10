import { RedisService } from "../../services/redis/redis.service.js";
import { generateOTP } from "../utils/otp.utils.js";

export class OTPService {

  static async createOTP(
    key: string
  ) {

    const otp =
      generateOTP();

    await RedisService.set(

      key,

      otp,

      300

    );

    return otp;

  }

  static async verifyOTP(

    key: string,

    otp: string

  ) {

    const storedOTP =
      await RedisService.get<string>(
        key
      );
    console.log("KEY:", key);
    console.log("Stored OTP:", storedOTP);
    console.log("Received OTP:", otp);
    console.log("Equal:", storedOTP === otp);

    if (!storedOTP) {

      return false;

    }

    if (String(storedOTP) !== String(otp)) {
      return false;
    }

    await RedisService.del(
      key
    );

    return true;

  }

}