import { z } from 'zod';
import { BookingType } from '@prisma/client';

export const CreateBookingSchema = z.object({
  jobId: z.string().uuid().optional(),
  providerId: z.string().uuid('Invalid provider ID'),
  workerId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  amount: z.coerce.number().positive('Amount must be a positive number'),
  estimatedFare: z.coerce.number().positive('Estimated fare must be positive'),
  type: z.nativeEnum(BookingType),
  address: z.any().optional(),
});

export type CreateBookingDto = z.infer<typeof CreateBookingSchema>;
