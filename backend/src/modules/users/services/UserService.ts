import type { User } from '@prisma/client';
import argon2 from 'argon2';
import { BaseService } from '../../../core/base/BaseService.js';
import type { IUserService } from '../interfaces/IUserService.js';
import type { IUserRepository } from '../interfaces/IUserRepository.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import { CacheKeys } from '../../../infrastructure/cache/cacheKeys.js';
import {
  NotFoundException,
  AuthenticationException,
} from '../../../core/exceptions/index.js';

export class UserService extends BaseService implements IUserService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly cache: ICacheService,
  ) {
    super('UserService');
  }

  async getProfile(userId: string): Promise<Partial<User>> {
    this.log('Fetching user profile', { userId });
    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User', userId);
    }

    // Exclude password hash from response
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async updateProfile(
    userId: string,
    data: {
      name?: string | undefined;
      email?: string | undefined;
      address?: string | undefined;
      city?: string | undefined;
      state?: string | undefined;
      pincode?: string | undefined;
      profileImage?: string | undefined;
    },
  ): Promise<Partial<User>> {
    this.log('Updating user profile information', { userId, data });
    
    // Ensure user exists first
    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User', userId);
    }

    const updated = await this.userRepo.update(userId, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.state !== undefined && { state: data.state }),
      ...(data.pincode !== undefined && { pincode: data.pincode }),
      ...(data.profileImage !== undefined && { profileImage: data.profileImage }),
    });

    const { passwordHash, ...safeUser } = updated;
    return safeUser;
  }

  async deleteAccount(userId: string): Promise<boolean> {
    this.log('Soft-deleting user account and clearing sessions', { userId });
    
    // Ensure user exists first
    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User', userId);
    }

    await this.userRepo.delete(userId);

    // Clear refresh tokens cached in Redis
    const cacheKey = CacheKeys.refreshToken(userId);
    await this.cache.del(cacheKey);

    return true;
  }

  async changePassword(userId: string, data: any): Promise<boolean> {
    this.log('Updating user password verification check', { userId });
    
    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User', userId);
    }

    // If password hash does not exist (e.g. Google-only sign-up), block standard change
    if (!user.passwordHash) {
      throw new AuthenticationException('Password change not available for OAuth accounts');
    }

    // Verify older password
    const isPasswordValid = await argon2.verify(user.passwordHash, data.oldPassword);
    if (!isPasswordValid) {
      throw new AuthenticationException('Current password verification failed');
    }

    // Generate new secure Argon2id hash
    const newHash = await argon2.hash(data.newPassword);
    await this.userRepo.update(userId, {
      passwordHash: newHash,
    });

    // Revoke current session credentials
    const cacheKey = CacheKeys.refreshToken(userId);
    await this.cache.del(cacheKey);

    return true;
  }
}
