import type { User } from '@prisma/client';
import argon2 from 'argon2';
import { BaseService } from '../../../core/base/BaseService.js';
import type { IUserService } from '../interfaces/IUserService.js';
import type { IUserRepository } from '../interfaces/IUserRepository.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import type { IStorageProvider } from '../../../core/interfaces/IProviders.js';
import { CacheKeys } from '../../../infrastructure/cache/cacheKeys.js';
import {
  NotFoundException,
  AuthenticationException,
} from '../../../core/exceptions/index.js';

export class UserService extends BaseService implements IUserService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly cache: ICacheService,
    private readonly storageProvider: IStorageProvider,
  ) {
    super('UserService');
  }

  private async signProfileImage(profileImage: string | null | undefined): Promise<string | null | undefined> {
    if (profileImage && profileImage.includes('.amazonaws.com/')) {
      try {
        const key = profileImage.split('.com/')[1];
        if (key) {
          return await this.storageProvider.getSignedUrl(key, 604800);
        }
      } catch (err) {
        this.log('Failed to sign profile image URL', { profileImage, err });
      }
    }
    return profileImage;
  }

  async getProfile(userId: string): Promise<Partial<User>> {
    this.log('Fetching user profile', { userId });
    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User', userId);
    }

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
    this.log('Deactivating user account', { userId });
    
    // Ensure user exists first
    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User', userId);
    }

    await this.userRepo.update(userId, { isActive: false });

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

  async uploadProfileImage(
    userId: string,
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<string> {
    this.log('Uploading profile image', { userId, filename, mimeType });

    // Validate user existence
    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User', userId);
    }

    // Generate unique key
    const fileExtension = filename.split('.').pop() || 'png';
    const key = `avatars/${userId}-${Date.now()}.${fileExtension}`;

    // Upload to storage provider (S3)
    const profileImageUrl = await this.storageProvider.upload(key, buffer, mimeType);

    // Save to user schema
    await this.userRepo.update(userId, {
      profileImage: profileImageUrl,
    });

    return profileImageUrl;
  }

  async deleteProfileImage(userId: string): Promise<void> {
    this.log('Deleting profile image', { userId });

    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User', userId);
    }

    if (user.profileImage) {
      if (user.profileImage.includes('.amazonaws.com/')) {
        const key = user.profileImage.split('.com/')[1];
        if (key) {
          await this.storageProvider.delete(key);
        }
      }

      await this.userRepo.update(userId, {
        profileImage: null,
      });
    }
  }
}
