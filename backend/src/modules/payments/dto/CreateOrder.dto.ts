import { z } from 'zod';

export const CreateOrderSchema = z.object({
  bookingId: z.string().uuid(),
});

export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;
