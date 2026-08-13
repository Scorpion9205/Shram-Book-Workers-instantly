import { User, Prisma } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { ConflictException, DatabaseException } from '../../../core/exceptions/index.js';
import type { IAuthRepository, CreateUserInput } from '../interfaces/IAuthRepository.js';

export class AuthRepository extends BaseRepository<User> implements IAuthRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.user.findUnique({
        where: { id, deletedAt: null },
      });
    } catch (err) {
      throw new DatabaseException('Error finding user by ID', err);
    }
  }

  async findByPhone(phone: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.user.findUnique({
        where: { phone, deletedAt: null },
      });
    } catch (err) {
      throw new DatabaseException('Error finding user by phone', err);
    }
  }

  async findByEmail(email: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.user.findUnique({
        where: { email, deletedAt: null },
      });
    } catch (err) {
      throw new DatabaseException('Error finding user by email', err);
    }
  }

  async findByGoogleId(googleId: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.user.findUnique({
        where: { googleId, deletedAt: null },
      });
    } catch (err) {
      throw new DatabaseException('Error finding user by Google ID', err);
    }
  }

  async create(data: CreateUserInput, tx?: Prisma.TransactionClient): Promise<User> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.user.create({
        data: {
          name: data.name,
          phone: data.phone,
          email: data.email,
          role: data.role,
          googleId: data.googleId,
          passwordHash: data.passwordHash,
          isVerified: data.isVerified ?? false,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A user with these credentials already exists');
      }
      throw new DatabaseException('Failed to create user', err);
    }
  }

  async update(id: string, data: Partial<User>, tx?: Prisma.TransactionClient): Promise<User> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.user.update({
        where: { id },
        data,
      });
    } catch (err) {
      throw new DatabaseException('Failed to update user', err);
    }
  }
}
