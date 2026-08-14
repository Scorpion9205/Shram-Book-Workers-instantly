import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import type { IAuthService, AuthResponse } from '../interfaces/IAuthService.js';
import type { IAuthRepository } from '../interfaces/IAuthRepository.js';
import type { IOTPService } from '../interfaces/IOTPService.js';
import type { ITokenService } from '../interfaces/ITokenService.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { UserRole } from '../../../core/enums/Role.js';
import { OTPChannel, OTPPurpose } from '../enums/index.js';
import {
  AuthenticationException,
  AuthorizationException,
  BusinessException,
  NotFoundException,
} from '../../../core/exceptions/index.js';
import type { User } from '@prisma/client';

export class AuthService implements IAuthService {
  constructor(
    private readonly userRepo: IAuthRepository,
    private readonly otpService: IOTPService,
    private readonly tokenService: ITokenService,
    private readonly cache: ICacheService,
    private readonly prisma: PrismaService,
  ) {}

  async requestOTP(channel: OTPChannel, identifier: string, role: UserRole): Promise<void> {
    // Only Provider or Worker roles are allowed via OTP auth
    if (role !== UserRole.PROVIDER && role !== UserRole.WORKER && role !== UserRole.AGENT) {
      throw new AuthorizationException('Only Provider, Worker, and Agent roles are supported via OTP login');
    }

    // Verify if email or phone is already registered with another role
    const existing = channel === OTPChannel.EMAIL
      ? await this.userRepo.findByEmail(identifier)
      : await this.userRepo.findByPhone(identifier);

    if (existing && existing.role !== role) {
      throw new BusinessException(
        'ROLE_MISMATCH',
        `This contact identifier is already registered as a ${existing.role}`,
      );
    }

    await this.otpService.request({
      channel,
      identifier,
      purpose: OTPPurpose.LOGIN,
    });
  }

  async verifyOTP(channel: OTPChannel, identifier: string, code: string): Promise<AuthResponse> {
    // 1. Verify code
    await this.otpService.verify({
      channel,
      identifier,
      purpose: OTPPurpose.LOGIN,
      code,
    });

    // 2. Fetch or create user + profile atomically in transaction
    const existing = channel === OTPChannel.EMAIL
      ? await this.userRepo.findByEmail(identifier)
      : await this.userRepo.findByPhone(identifier);

    let user: User;

    if (existing) {
      user = existing;
    } else {
      // Determine the role dynamically during first OTP verification.
      // Default to PROVIDER if not specified, but usually passed or determined by active signup session.
      // We read the temporary sign-up role cache which is set during requestOTP.
      // Since it's sign-up, let's find user's target role or default to PROVIDER/WORKER based on cached session.
      // For simplicity, let's try to query cached signup role, or fail.
      const signupRole = await this.cache.get<UserRole>(`signup:role:${identifier}`) || UserRole.PROVIDER;

      user = await this.prisma.transaction(async (tx) => {
        const newUser = await this.userRepo.create({
          name: identifier.split('@')[0] || 'User', // Default name
          phone: channel === OTPChannel.SMS ? identifier : '',
          email: channel === OTPChannel.EMAIL ? identifier : null,
          role: signupRole,
          isVerified: true,
        }, tx);

        // Create Profile based on role
        if (signupRole === UserRole.PROVIDER) {
          await tx.providerProfile.create({ data: { userId: newUser.id } });
        } else if (signupRole === UserRole.WORKER) {
          await tx.workerProfile.create({ data: { userId: newUser.id } });
        } else if (signupRole === UserRole.AGENT) {
          await tx.agentProfile.create({ data: { userId: newUser.id, agencyName: `${newUser.name} Agency` } });
        }

        return newUser;
      });
    }

    // 3. Issue Tokens
    const accessToken = this.tokenService.generateAccessToken(user.id, user.role as UserRole);
    const refreshToken = this.tokenService.generateRefreshToken(user.id);
    await this.tokenService.storeRefreshToken(user.id, refreshToken);

    return { user, accessToken, refreshToken };
  }

  async adminLogin(email: string, password: string): Promise<AuthResponse> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new AuthenticationException('Invalid credentials');
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.AGENT) {
      throw new AuthorizationException('Access denied. Administrator/Agent permissions required.');
    }

    if (!user.passwordHash) {
      throw new AuthenticationException('Password login not configured for this account');
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      throw new AuthenticationException('Invalid credentials');
    }

    const accessToken = this.tokenService.generateAccessToken(user.id, user.role as UserRole);
    const refreshToken = this.tokenService.generateRefreshToken(user.id);
    await this.tokenService.storeRefreshToken(user.id, refreshToken);

    return { user, accessToken, refreshToken };
  }

  async googleAuth(idToken: string, role: UserRole): Promise<AuthResponse> {
    // Stub verification of Google Token for Phase 3
    // In production, use OAuth2Client from google-auth-library
    let payload: any;
    try {
      payload = jwt.decode(idToken);
      if (!payload || !payload.email) {
        throw new Error('Invalid token structure');
      }
    } catch {
      throw new AuthenticationException('Invalid Google ID token');
    }

    const email = payload.email.toLowerCase();
    const googleId = payload.sub;
    const name = payload.name || email.split('@')[0];

    const existing = await this.userRepo.findByGoogleId(googleId) || await this.userRepo.findByEmail(email);

    let user: User;

    if (existing) {
      if (existing.role !== role) {
        throw new BusinessException('ROLE_MISMATCH', `Account is registered as a ${existing.role}`);
      }
      user = existing;
      if (!user.googleId) {
        // Link Google ID if not already linked
        user = await this.userRepo.update(user.id, { googleId });
      }
    } else {
      user = await this.prisma.transaction(async (tx) => {
        const newUser = await this.userRepo.create({
          name,
          phone: '',
          email,
          role,
          googleId,
          isVerified: true,
        }, tx);

        if (role === UserRole.PROVIDER) {
          await tx.providerProfile.create({ data: { userId: newUser.id } });
        } else if (role === UserRole.WORKER) {
          await tx.workerProfile.create({ data: { userId: newUser.id } });
        } else if (role === UserRole.AGENT) {
          await tx.agentProfile.create({ data: { userId: newUser.id, agencyName: `${newUser.name} Agency` } });
        }

        return newUser;
      });
    }

    const accessToken = this.tokenService.generateAccessToken(user.id, user.role as UserRole);
    const refreshToken = this.tokenService.generateRefreshToken(user.id);
    await this.tokenService.storeRefreshToken(user.id, refreshToken);

    return { user, accessToken, refreshToken };
  }

  async refreshToken(token: string): Promise<{ accessToken: string }> {
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret');
    } catch {
      throw new AuthenticationException('Invalid refresh token', 'TOKEN_INVALID');
    }

    const userId = payload.userId;
    const isStored = await this.tokenService.verifyRefreshToken(userId, token);
    if (!isStored) {
      throw new AuthenticationException('Revoked or expired refresh token', 'TOKEN_REVOKED');
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User', userId);
    }

    const accessToken = this.tokenService.generateAccessToken(user.id, user.role as UserRole);
    return { accessToken };
  }

  async logout(userId: string): Promise<void> {
    await this.tokenService.revokeRefreshToken(userId);
  }

  async changePassword(userId: string, currentPass: string, newPass: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User', userId);
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.AGENT) {
      throw new AuthorizationException('Password management is restricted to Administrators and Agents only');
    }

    if (!user.passwordHash) {
      throw new BusinessException('PASSWORD_NOT_CONFIGURED', 'Account does not have a password configured');
    }

    const isValid = await argon2.verify(user.passwordHash, currentPass);
    if (!isValid) {
      throw new AuthenticationException('Invalid current password');
    }

    const newHash = await argon2.hash(newPass, { type: argon2.argon2id });
    await this.userRepo.update(userId, { passwordHash: newHash });
  }
}
