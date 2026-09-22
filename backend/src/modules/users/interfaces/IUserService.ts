import type { User } from '@prisma/client';

export interface IUserService {
  getProfile(userId: string): Promise<Partial<User>>;
  updateProfile(
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
  ): Promise<Partial<User>>;
  deleteAccount(userId: string): Promise<boolean>;
  changePassword(userId: string, data: any): Promise<boolean>;
  uploadProfileImage(userId: string, buffer: Buffer, filename: string, mimeType: string): Promise<string>;
  deleteProfileImage(userId: string): Promise<void>;
}
