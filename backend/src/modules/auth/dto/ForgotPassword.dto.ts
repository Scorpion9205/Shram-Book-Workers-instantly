import { z } from 'zod';

export const ForgotPasswordSchema = z.object({
  identifier: z.string().min(3, 'Enter your registered phone or email'),
});

export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
