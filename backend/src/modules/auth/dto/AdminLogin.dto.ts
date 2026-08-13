import { z } from 'zod';

export const AdminLoginSchema = z.object({
  email: z.string().email('Invalid admin email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type AdminLoginDto = z.infer<typeof AdminLoginSchema>;
