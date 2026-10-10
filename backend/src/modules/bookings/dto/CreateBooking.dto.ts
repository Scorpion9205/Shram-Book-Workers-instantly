import { z } from 'zod';
import { BookingType } from '@prisma/client';

// providerId/amount/estimatedFare are deliberately NOT accepted from the client — providerId
// is always the authenticated caller, and amount/estimatedFare are derived server-side from
// the Job's own budget (see BookingService.createBooking). Trusting these from the request
// body would let any authenticated user create a booking impersonating another provider at
// whatever price they chose, which a Razorpay order would then be created against.
export const CreateBookingSchema = z.object({
  jobId: z.string().uuid('A valid jobId is required'),
  workerId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  type: z.nativeEnum(BookingType),
  address: z.any().optional(),
});

export type CreateBookingDto = z.infer<typeof CreateBookingSchema>;
