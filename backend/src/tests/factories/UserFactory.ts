import type { User, UserRole } from "@prisma/client";

export class UserFactory {
  static create(overrides: Partial<User> = {}): User {
    return {
      id: overrides.id || `user_${Math.random().toString(36).substring(2, 9)}`,
      name: overrides.name || "Test User",
      phone: overrides.phone || `+91${Math.floor(6000000000 + Math.random() * 4000000000)}`,
      email: overrides.email !== undefined ? overrides.email : `test_${Math.random().toString(36).substring(2, 5)}@shram.com`,
      passwordHash: overrides.passwordHash !== undefined ? overrides.passwordHash : null,
      googleId: overrides.googleId !== undefined ? overrides.googleId : null,
      role: overrides.role || ("WORKER" as UserRole),
      isVerified: overrides.isVerified !== undefined ? overrides.isVerified : true,
      address: overrides.address !== undefined ? overrides.address : null,
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
      profileImage: overrides.profileImage !== undefined ? overrides.profileImage : null,
      city: overrides.city !== undefined ? overrides.city : null,
      pincode: overrides.pincode !== undefined ? overrides.pincode : null,
      state: overrides.state !== undefined ? overrides.state : null,
      deletedAt: overrides.deletedAt !== undefined ? overrides.deletedAt : null,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    };
  }
}
