import { z } from 'zod';
import { UserRole } from '../../../core/enums/Role.js';

export const GoogleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
  role: z.nativeEnum(UserRole),
});

export type GoogleAuthDto = z.infer<typeof GoogleAuthSchema>;
