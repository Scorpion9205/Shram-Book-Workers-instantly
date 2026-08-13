import { OTPChannel, OTPPurpose } from '../enums/index.js';

export interface RequestOTPInput {
  channel: OTPChannel;
  identifier: string;
  purpose: OTPPurpose;
  bookingId?: string;
}

export interface VerifyOTPInput {
  channel: OTPChannel;
  identifier: string;
  purpose: OTPPurpose;
  code: string;
}

export interface IOTPService {
  request(input: RequestOTPInput): Promise<void>;
  verify(input: VerifyOTPInput): Promise<boolean>;
}
