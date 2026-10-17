import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomInt } from 'crypto';
import type { IAuthService, AuthResponse } from '../interfaces/IAuthService.js';
import type { IAuthRepository } from '../interfaces/IAuthRepository.js';
import type { IPasswordResetRepository } from '../interfaces/IPasswordResetRepository.js';
import type { IOTPService } from '../interfaces/IOTPService.js';
import type { ITokenService } from '../interfaces/ITokenService.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import type { IEventPublisher } from '../../../core/interfaces/IEventPublisher.js';
import { RoutingKeys } from '../../../infrastructure/queue/queue.constants.js';
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
import type { IEmailProvider, ISmsProvider, IGoogleOAuthProvider } from '../../../core/interfaces/IProviders.js';
import React from 'react';
import { renderEmail } from '../../../shared/email/utils/render-email.js';
import OtpEmail from '../../../shared/email/templates/OtpEmail.js';
import ForgotPassword from '../../../shared/email/templates/ForgotPassword.js';
import PasswordChanged from '../../../shared/email/templates/PasswordChanged.js';
import { generateResetToken, hashResetToken, PASSWORD_RESET_TOKEN_EXPIRY_MINUTES } from '../utils/password-reset.util.js';
import type { SignupInput } from '../validations/auth.validation.js';
import { env } from '../../../config/env.js';

export class AuthService implements IAuthService {
  constructor(
    private readonly userRepo: IAuthRepository,
    private readonly otpService: IOTPService,
    private readonly tokenService: ITokenService,
    private readonly cache: ICacheService,
    private readonly prisma: PrismaService,
    private readonly emailProvider: IEmailProvider,
    private readonly smsProvider: ISmsProvider,
    private readonly googleOAuthProvider: IGoogleOAuthProvider,
    private readonly passwordResetRepo: IPasswordResetRepository,
    private readonly eventPublisher: IEventPublisher,
  ) {}

  // Tells the notification consumer a brand-new account exists so it can send the welcome email.
  // Never blocks or fails the login: if the broker is down, the user just doesn't get the email.
  private async announceRegistration(user: User): Promise<void> {
    try {
      await this.eventPublisher.publish(RoutingKeys.USER_REGISTERED, { userId: user.id, name: user.name });
    } catch (err) {
      console.warn(`[Welcome email] Could not publish registration event for user ${user.id}:`, err);
    }
  }

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

    // Expire any still-active OTP from a previous signup attempt for this phone/email —
    // without this, retrying signup (e.g. after a validation error) leaves multiple active
    // rows and findActiveOTP always matches the newest, silently invalidating a code the
    // user may have already seen in an earlier email/SMS.
    await this.prisma.client.otp.updateMany({
      where: { identifier: data.phone, purpose: 'LOGIN', consumedAt: null, expiresAt: { gte: new Date() } },
      data: { expiresAt: new Date() },
    });
    if (data.email) {
      await this.prisma.client.otp.updateMany({
        where: { identifier: data.email, purpose: 'LOGIN', consumedAt: null, expiresAt: { gte: new Date() } },
        data: { expiresAt: new Date() },
      });
    }

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

    // Cache the full signup payload under BOTH identifiers — verifyOTP() may be called
    // with either the phone or the email identifier depending on which OTP the user
    // completes, and previously only the phone key was populated, so verifying via the
    // email OTP silently missed the cache (wrong role defaulted, phone left blank).
    await this.cache.set(`signup:data:${data.phone}`, data, 600); // 10m TTL
    await this.cache.set(`signup:role:${data.phone}`, data.role, 600); // 10m TTL
    if (data.email) {
      await this.cache.set(`signup:data:${data.email}`, data, 600); // 10m TTL
      await this.cache.set(`signup:role:${data.email}`, data.role, 600); // 10m TTL
    }

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
          frontendUrl: env.FRONTEND_URL,
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

  // True only for the temporary reviewer login: both env vars set, email channel, and the
  // email matches. Used so a reviewer without access to a real inbox can still sign in.
  private isReviewLogin(channel: OTPChannel, identifier: string): boolean {
    if (!env.REVIEW_TEST_EMAIL || !env.REVIEW_TEST_OTP) return false;
    return channel === OTPChannel.EMAIL && identifier.toLowerCase() === env.REVIEW_TEST_EMAIL.toLowerCase();
  }

  async requestOTP(channel: OTPChannel, identifier: string, role?: UserRole): Promise<void> {
    // Reviewer login: make sure the test Provider account exists and skip sending any OTP.
    if (this.isReviewLogin(channel, identifier)) {
      const reviewer = await this.userRepo.findByEmail(identifier);
      if (!reviewer) {
        await this.prisma.transaction(async (tx) => {
          const created = await this.userRepo.create({
            name: 'Review Tester',
            phone: null,
            email: identifier,
            role: UserRole.PROVIDER,
            isVerified: true,
          }, tx);
          await tx.providerProfile.create({ data: { userId: created.id } });
        });
        return;
      }
      // Only ever a Provider; if that email belongs to anyone else, fall back to the normal flow.
      if (reviewer.role === UserRole.PROVIDER) return;
    }

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
    // 1. Verify code. The reviewer login compares against the fixed env OTP instead, and only
    // while the account is still a Provider; everyone else goes through the normal check.
    let reviewLoginOk = false;
    if (this.isReviewLogin(channel, identifier)) {
      const reviewer = await this.userRepo.findByEmail(identifier);
      if (reviewer?.role === UserRole.PROVIDER) {
        if (code !== env.REVIEW_TEST_OTP) {
          throw new BusinessException('OTP_INVALID', 'Invalid OTP code');
        }
        reviewLoginOk = true;
      }
    }

    if (!reviewLoginOk) {
      await this.otpService.verify({
        channel,
        identifier,
        purpose: OTPPurpose.LOGIN,
        code,
      });
    }

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
          // null (not '') when this is an email-only sign-up with no phone on record — same
          // reasoning as googleAuth() above, so this path doesn't collide on the unique index.
          phone: signupData?.phone || (channel === OTPChannel.SMS ? identifier : null),
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

      await this.announceRegistration(user);
    }

    // 3. Issue Tokens
    const accessToken = this.tokenService.generateAccessToken(user.id, user.role as UserRole);
    const refreshToken = this.tokenService.generateRefreshToken(user.id);
    await this.tokenService.storeRefreshToken(user.id, refreshToken);

    const { passwordHash, ...safeUser } = user;

    // Reviewer login: land them straight on a booking that shows the Pay button.
    if (reviewLoginOk) {
      const bookingId = await this.ensureReviewBooking(user.id);
      if (bookingId) {
        return { user: safeUser, accessToken, refreshToken, redirectTo: `/provider/booking/${bookingId}` };
      }
    }

    return { user: safeUser, accessToken, refreshToken };
  }

  // Makes sure the reviewer Provider has one unpaid ONLINE booking to pay for, so the review
  // can reach the Razorpay checkout without posting jobs or finding a worker first.
  // Reuses an existing unpaid one; creates a demo worker + job + booking only if none exists.
  // Returns undefined (and the reviewer just lands on the dashboard) if no skill exists to attach.
  private async ensureReviewBooking(providerUserId: string): Promise<string | undefined> {
    const existing = await this.prisma.client.booking.findFirst({
      where: {
        providerId: providerUserId,
        paymentMode: 'ONLINE',
        status: { in: ['CREATED', 'PAYMENT_PENDING'] },
      },
      select: { id: true },
    });
    if (existing) return existing.id;

    const skill = await this.prisma.client.skill.findFirst({ select: { id: true } });
    if (!skill) return undefined;

    return this.prisma.transaction(async (tx) => {
      const workerUser = await tx.user.create({
        data: { name: 'Demo Worker', role: UserRole.WORKER, isVerified: true },
      });
      const worker = await tx.workerProfile.create({
        data: { userId: workerUser.id, isAvailable: false },
      });
      const job = await tx.job.create({
        data: {
          title: 'Demo job for payment review',
          skillId: skill.id,
          requiredWorkers: 1,
          budget: 500,
          providerId: providerUserId,
        },
      });
      const booking = await tx.booking.create({
        data: {
          jobId: job.id,
          providerId: providerUserId,
          workerId: worker.id,
          amount: 500,
          estimatedFare: 500,
          status: 'CREATED',
          paymentMode: 'ONLINE',
        },
      });
      return booking.id;
    });
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

    const { passwordHash, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  }

  async googleAuth(idToken: string, role: UserRole): Promise<AuthResponse> {
    // Verifies the token's signature against Google's public keys (audience-checked against
    // our own GOOGLE_CLIENT_ID) — never trust a raw jwt.decode() of this token, which reads
    // the claims without checking they were ever actually signed by Google.
    const payload = await this.googleOAuthProvider.verifyIdToken(idToken);

    const email = payload.email.toLowerCase();
    const googleId = payload.sub;
    const name = payload.name || email.split('@')[0] || 'User';

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
          // Google OAuth users never provide a phone — null (not '') so Postgres's unique
          // constraint on phone correctly allows multiple accounts with no phone, instead of
          // every account after the first colliding on the same empty-string value.
          phone: null,
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

      await this.announceRegistration(user);
    }

    const accessToken = this.tokenService.generateAccessToken(user.id, user.role as UserRole);
    const refreshToken = this.tokenService.generateRefreshToken(user.id);
    await this.tokenService.storeRefreshToken(user.id, refreshToken);

    const { passwordHash, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  }

  async refreshToken(token: string): Promise<{ accessToken: string }> {
    let payload: any;
    try {
      payload = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
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

  async forgotPassword(identifier: string): Promise<void> {
    const user = identifier.includes('@')
      ? await this.userRepo.findByEmail(identifier)
      : await this.userRepo.findByPhone(identifier);

    // Silently no-op for accounts that don't exist, aren't password-based (Provider/Worker
    // are OTP-only), or have no email on file (the reset link can only be delivered by email)
    // — the controller always reports success regardless, so this never discloses which
    // identifiers are registered.
    if (!user || !user.email || !user.passwordHash) {
      return;
    }
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.AGENT) {
      return;
    }

    await this.passwordResetRepo.invalidateAllForUser(user.id);

    const { token, tokenHash } = generateResetToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
    await this.passwordResetRepo.create({ userId: user.id, tokenHash, expiresAt });

    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    const body = await renderEmail(React.createElement(ForgotPassword, {
      name: user.name,
      resetLink,
      frontendUrl: env.FRONTEND_URL,
    }));
    await this.emailProvider.send(user.email, 'Reset your SHRAM password', body);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashResetToken(token);
    const resetToken = await this.passwordResetRepo.findValidByTokenHash(tokenHash);
    if (!resetToken) {
      throw new BusinessException('RESET_TOKEN_INVALID', 'This reset link is invalid or has expired');
    }

    const user = await this.userRepo.findById(resetToken.userId);
    if (!user) {
      throw new NotFoundException('User', resetToken.userId);
    }

    const newHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.userRepo.update(user.id, { passwordHash: newHash });
    await this.passwordResetRepo.markUsed(resetToken.id);
    // Revoke any existing session — a leaked/old device holding a refresh token shouldn't
    // survive a password reset, which is usually done specifically because of a compromise.
    await this.tokenService.revokeRefreshToken(user.id);

    if (user.email) {
      const body = await renderEmail(React.createElement(PasswordChanged, {
        name: user.name,
        frontendUrl: env.FRONTEND_URL,
      }));
      await this.emailProvider.send(user.email, 'Your SHRAM password has been changed', body);
    }
  }
}
