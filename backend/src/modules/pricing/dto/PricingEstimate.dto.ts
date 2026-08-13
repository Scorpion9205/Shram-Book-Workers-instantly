import { z } from 'zod';

export const PricingEstimateSchema = z.object({
  skillId: z.string().uuid('Invalid skill ID format'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  durationHours: z.coerce.number().positive('Duration must be positive').default(1),
  workerLatitude: z.coerce.number().min(-90).max(90).optional(),
  workerLongitude: z.coerce.number().min(-180).max(180).optional(),
});

export type PricingEstimateDto = z.infer<typeof PricingEstimateSchema>;
