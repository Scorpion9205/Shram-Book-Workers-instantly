import type { User } from '@prisma/client';
import { UserRole } from '../../../core/enums/Role.js';

export interface CreateUserInput {
  name: string;
  phone: string;
  email?: string | null | undefined;
  role: UserRole;
  googleId?: string | null | undefined;
  passwordHash?: string | null | undefined;
  isVerified?: boolean;
}

export interface IAuthRepository {
  findById(id: string, tx?: any): Promise<User | null>;
  findByPhone(phone: string, tx?: any): Promise<User | null>;
  findByEmail(email: string, tx?: any): Promise<User | null>;
  findByGoogleId(googleId: string, tx?: any): Promise<User | null>;
  create(data: CreateUserInput, tx?: any): Promise<User>;
  update(id: string, data: Partial<User>, tx?: any): Promise<User>;
}
