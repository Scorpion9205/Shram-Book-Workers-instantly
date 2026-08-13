import { z } from 'zod';
import { OTPChannel } from '../enums/OTPChannel.js';

export const VerifyOTPSchema = z.object({
  channel: z.nativeEnum(OTPChannel),
  identifier: z.string().min(1, 'Identifier is required'),
  code: z.string().length(6, 'OTP code must be exactly 6 characters'),
}).refine((data) => {
  if (data.channel === OTPChannel.EMAIL) {
    return z.string().email().safeParse(data.identifier).success;
  } else {
    return /^\+?[1-9]\d{9,14}$/.test(data.identifier);
  }
}, {
  message: 'Identifier must match the channel type (valid Email or Phone number)',
  path: ['identifier'],
});

export type VerifyOTPDto = z.infer<typeof VerifyOTPSchema>;
