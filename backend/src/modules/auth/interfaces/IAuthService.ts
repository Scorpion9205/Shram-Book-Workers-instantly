import type { User } from '@prisma/client';
import { UserRole } from '../../../core/enums/Role.js';
import { OTPChannel } from '../enums/index.js';

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface IAuthService {
  requestOTP(channel: OTPChannel, identifier: string, role: UserRole): Promise<void>;
  verifyOTP(channel: OTPChannel, identifier: string, code: string): Promise<AuthResponse>;
  adminLogin(email: string, password: string): Promise<AuthResponse>;
  googleAuth(idToken: string, role: UserRole): Promise<AuthResponse>;
  refreshToken(token: string): Promise<{ accessToken: string }>;
  logout(userId: string): Promise<void>;
  changePassword(userId: string, currentPass: string, newPass: string): Promise<void>;
}
