import { z } from 'zod';
import { BookingStatus } from '@prisma/client';
import { paginationSchema } from '../../../shared/validators/common.schemas.js';

export const FilterBookingsSchema = z.object({
  providerId: z.string().uuid().optional(),
  workerId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  status: z.nativeEnum(BookingStatus).optional(),
  jobId: z.string().uuid().optional(),
}).merge(paginationSchema);

export type FilterBookingsDto = z.infer<typeof FilterBookingsSchema>;
