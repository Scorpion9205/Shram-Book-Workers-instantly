import { z } from 'zod';
import { CancelReason } from '../enums/CancelReason.js';

export const CancelBookingSchema = z.object({
  reason: z.nativeEnum(CancelReason, {
    errorMap: () => ({ message: 'Please provide a valid cancellation reason' }),
  }),
  details: z.string().max(255).optional(),
});

export type CancelBookingDto = z.infer<typeof CancelBookingSchema>;
