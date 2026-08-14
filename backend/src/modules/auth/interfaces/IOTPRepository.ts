import type { Otp } from '@prisma/client';
import { OTPPurpose, OTPChannel } from '../enums/index.js';

export interface CreateOtpInput {
  purpose: OTPPurpose;
  channel: OTPChannel;
  identifier: string;
  codeHash: string;
  expiresAt: Date;
  bookingId?: string | undefined;
}

export interface IOTPRepository {
  create(data: CreateOtpInput, tx?: any): Promise<Otp>;
  findActiveOTP(identifier: string, purpose: OTPPurpose, tx?: any): Promise<Otp | null>;
  incrementAttempts(id: string, tx?: any): Promise<void>;
  markConsumed(id: string, tx?: any): Promise<void>;
  invalidatePrevious(identifier: string, purpose: OTPPurpose, tx?: any): Promise<void>;
}
