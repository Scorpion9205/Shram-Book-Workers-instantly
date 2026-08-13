import { UserRole } from '../../../core/enums/Role.js';

export interface ITokenPayload {
  userId: string;
  role: UserRole;
}

export interface ITokenService {
  generateAccessToken(userId: string, role: UserRole): string;
  generateRefreshToken(userId: string): string;
  storeRefreshToken(userId: string, token: string): Promise<void>;
  verifyRefreshToken(userId: string, token: string): Promise<boolean>;
  revokeRefreshToken(userId: string): Promise<void>;
  verifyAccessToken(token: string): ITokenPayload;
}
