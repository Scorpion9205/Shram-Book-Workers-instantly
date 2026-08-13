import argon2 from 'argon2';
import { randomInt } from 'crypto';
import { IOTPService, RequestOTPInput, VerifyOTPInput } from '../interfaces/IOTPService.js';
import { IOTPRepository } from '../interfaces/IOTPRepository.js';
import { ICacheService } from '../../../core/interfaces/ICacheService.js';
import { IEmailProvider, ISmsProvider } from '../../../core/interfaces/IProviders.js';
import { CacheKeys } from '../../../infrastructure/cache/cacheKeys.js';
import { OTP_CONSTANTS } from '../constants/otp.constants.js';
import { OTPChannel } from '../enums/OTPChannel.js';
import { BusinessException, TooManyRequestsException } from '../../../core/exceptions/index.js';

export class OTPService implements IOTPService {
  constructor(
    private readonly otpRepo: IOTPRepository,
    private readonly cache: ICacheService,
    private readonly emailProvider: IEmailProvider,
    private readonly smsProvider: ISmsProvider,
  ) {}

  async request(input: RequestOTPInput): Promise<void> {
    await this.enforceRateLimit(input.identifier);

    // Generate 6-digit code
    const code = this.generateCode();

    // Hash the code using Argon2id
    const codeHash = await argon2.hash(code, {
      type: argon2.argon2id,
    });

    const expiresAt = new Date(Date.now() + OTP_CONSTANTS.EXPIRY_MINUTES * 60 * 1000);

    // Invalidate any previous OTPs for this identifier/purpose
    await this.otpRepo.invalidatePrevious(input.identifier, input.purpose);

    // Persist OTP
    await this.otpRepo.create({
      purpose: input.purpose,
      channel: input.channel,
      identifier: input.identifier,
      codeHash,
      expiresAt,
      bookingId: input.bookingId,
    });

    // Dispatch OTP asynchronously
    await this.dispatch(input.channel, input.identifier, code);
  }

  async verify(input: VerifyOTPInput): Promise<boolean> {
    const otp = await this.otpRepo.findActiveOTP(input.identifier, input.purpose);

    if (!otp) {
      throw new BusinessException('OTP_NOT_FOUND', 'OTP not found or already consumed/expired');
    }

    if (otp.expiresAt < new Date()) {
      throw new BusinessException('OTP_EXPIRED', 'OTP code has expired');
    }

    if (otp.attempts >= OTP_CONSTANTS.MAX_ATTEMPTS) {
      throw new BusinessException('OTP_LOCKED', 'Too many failed verification attempts. Please request a new OTP.');
    }

    // Verify Argon2 hash
    const isValid = await argon2.verify(otp.codeHash, input.code);

    if (!isValid) {
      await this.otpRepo.incrementAttempts(otp.id);
      throw new BusinessException('OTP_INVALID', 'Invalid OTP code');
    }

    // Mark as consumed
    await this.otpRepo.markConsumed(otp.id);

    return true;
  }

  private generateCode(): string {
    return randomInt(100000, 999999).toString();
  }

  private async enforceRateLimit(identifier: string): Promise<void> {
    const key = CacheKeys.otpAttempts(identifier);
    const count = await this.cache.get<number>(key) ?? 0;

    if (count >= OTP_CONSTANTS.MAX_PER_HOUR) {
      throw new TooManyRequestsException('OTP request limit reached for this hour. Please try again later.');
    }

    await this.cache.incr(key, 3600); // 1 hour TTL
  }

  private async dispatch(channel: OTPChannel, identifier: string, code: string): Promise<void> {
    const message = `Your SHRAM verification code is ${code}. It is valid for ${OTP_CONSTANTS.EXPIRY_MINUTES} minutes.`;

    if (channel === OTPChannel.EMAIL) {
      await this.emailProvider.send(identifier, 'SHRAM Verification Code', message);
    } else {
      await this.smsProvider.send(identifier, message);
    }
  }
}
