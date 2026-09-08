import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomInt } from 'crypto';
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
import type { IEmailProvider, ISmsProvider } from '../../../core/interfaces/IProviders.js';
import React from 'react';
import { renderEmail } from '../../../shared/email/utils/render-email.js';
import OtpEmail from '../../../shared/email/templates/OtpEmail.js';
import type { SignupInput } from '../validations/auth.validation.js';

export class AuthService implements IAuthService {
  constructor(
    private readonly userRepo: IAuthRepository,
    private readonly otpService: IOTPService,
    private readonly tokenService: ITokenService,
    private readonly cache: ICacheService,
    private readonly prisma: PrismaService,
    private readonly emailProvider: IEmailProvider,
    private readonly smsProvider: ISmsProvider,
  ) {}

  async signup(data: SignupInput): Promise<void> {
    // 1. Check existing phone
    const existingPhone = await this.userRepo.findByPhone(data.phone);
    if (existingPhone) {
      throw new BusinessException('DUPLICATE_PHONE', 'Phone number is already registered.');
    }

    // 2. Check existing email if provided
    if (data.email) {
      const existingEmail = await this.userRepo.findByEmail(data.email);
      if (existingEmail) {
        throw new BusinessException('DUPLICATE_EMAIL', 'Email address is already registered.');
      }
    }

    // 3. Generate a cryptographically secure 6-digit random code
    const code = randomInt(100000, 1000000).toString();
    const hash = await argon2.hash(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save one OTP record for the phone number (primary identifier)
    await this.prisma.client.otp.create({
      data: {
        identifier: data.phone,
        codeHash: hash,
        purpose: 'LOGIN',
        channel: 'SMS',
        expiresAt,
      }
    });

    // If email is also provided, save an OTP record for the email with the same hash
    if (data.email) {
      await this.prisma.client.otp.create({
        data: {
          identifier: data.email,
          codeHash: hash,
          purpose: 'LOGIN',
          channel: 'EMAIL',
          expiresAt,
        }
      });
    }

    // Cache the full signup payload under the phone number
    await this.cache.set(`signup:data:${data.phone}`, data, 600); // 10m TTL
    await this.cache.set(`signup:role:${data.phone}`, data.role, 600); // 10m TTL

    let smsSuccess = false;
    let emailSuccess = false;

    // Send SMS (phone)
    const smsMessage = `Your SHRAM verification code is ${code}. It is valid for 10 minutes.`;
    try {
      await this.smsProvider.send(data.phone, smsMessage);
      smsSuccess = true;
    } catch (error) {
      console.warn(`[SMS Dispatch Warning] SMS sending failed during signup for ${data.phone}:`, error);
    }

    // Send Email if provided
    if (data.email) {
      try {
        const body = await renderEmail(React.createElement(OtpEmail, {
          name: data.name,
          otp: code,
        }));
        await this.emailProvider.send(data.email, 'Your SHRAM Verification Code', body);
        emailSuccess = true;
      } catch (error) {
        console.warn(`[Email Dispatch Warning] Email sending failed during signup for ${data.email}:`, error);
      }
    }

    // If both failed, or if SMS failed and no email was provided, throw an error
    if (!smsSuccess && !emailSuccess) {
      throw new BusinessException('OTP_DISPATCH_FAILED', 'Failed to dispatch verification code via SMS and Email.');
    }
  }

  async requestOTP(channel: OTPChannel, identifier: string, role?: UserRole): Promise<void> {
    const existing = channel === OTPChannel.EMAIL
      ? await this.userRepo.findByEmail(identifier)
      : await this.userRepo.findByPhone(identifier);

    if (role) {
      // Sign-up flow: role is explicitly specified
      if (role !== UserRole.PROVIDER && role !== UserRole.WORKER && role !== UserRole.AGENT) {
        throw new AuthorizationException('Only Provider, Worker, and Agent roles are supported via OTP login');
      }

      if (existing) {
        if (existing.role !== role) {
          throw new BusinessException(
            'ROLE_MISMATCH',
            `This contact identifier is already registered as a ${existing.role}`,
          );
        }
      }

      // Store signup role temporarily in cache
      await this.cache.set(`signup:role:${identifier}`, role, 600);
    } else {
      // Login flow: role is dynamically detected from DB
      if (!existing) {
        throw new AuthenticationException('This contact details is not registered. Please sign up first.');
      }

      if (existing.role !== UserRole.PROVIDER && existing.role !== UserRole.WORKER && existing.role !== UserRole.AGENT) {
        throw new AuthorizationException('Only Provider, Worker, and Agent roles are supported via OTP login');
      }

      // Store detected role temporarily in cache
      await this.cache.set(`signup:role:${identifier}`, existing.role, 600);
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
      // Try to retrieve cached sign-up data (contains name, phone, email)
      const signupData = await this.cache.get<{ name: string; email?: string; phone: string; role: UserRole }>(`signup:data:${identifier}`);
      const signupRole = signupData?.role || await this.cache.get<UserRole>(`signup:role:${identifier}`) || UserRole.PROVIDER;

      user = await this.prisma.transaction(async (tx) => {
        const newUser = await this.userRepo.create({
          name: signupData?.name || identifier.split('@')[0] || 'User',
          phone: signupData?.phone || (channel === OTPChannel.SMS ? identifier : ''),
          email: signupData?.email || (channel === OTPChannel.EMAIL ? identifier : null),
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

    if (user.role !== UserRole.ADMIN) {
      throw new AuthorizationException('Access denied. Administrator permissions required.');
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
        throw new AuthenticationException('Invalid Google ID token structure');
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
