import { z } from 'zod';
import { OTPChannel } from '../enums/OTPChannel.js';
import { UserRole } from '../../../core/enums/Role.js';

export const RequestOTPSchema = z.object({
  channel: z.nativeEnum(OTPChannel),
  identifier: z.string().min(1, 'Identifier is required'),
  role: z.nativeEnum(UserRole).optional(),
}).refine((data) => {
  if (data.channel === OTPChannel.EMAIL) {
    return z.string().email().safeParse(data.identifier).success;
  } else {
    // Phone validator: fits India format or international E.164
    return /^\+?[1-9]\d{9,14}$/.test(data.identifier);
  }
}, {
  message: 'Identifier must match the channel type (valid Email or Phone number)',
  path: ['identifier'],
});

export type RequestOTPDto = z.infer<typeof RequestOTPSchema>;
