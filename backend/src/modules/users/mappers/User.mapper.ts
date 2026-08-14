import type { User } from '@prisma/client';

export interface UserDto {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  isVerified: boolean;
  profileImage: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  isActive: boolean;
  createdAt: Date;
}

export class UserMapper {
  static toDto(user: User): UserDto {
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      profileImage: user.profileImage,
      address: user.address,
      city: user.city,
      state: user.state,
      pincode: user.pincode,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
