import type { PlatformSetting, Prisma } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { DatabaseException } from '../../../core/exceptions/index.js';
import type { IPlatformSettingRepository } from '../interfaces/IPlatformSettingRepository.js';

export class PlatformSettingRepository extends BaseRepository<PlatformSetting>
  implements IPlatformSettingRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async get(key: string, tx?: Prisma.TransactionClient): Promise<PlatformSetting | null> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.platformSetting.findUnique({
        where: { key },
      });
    } catch (err) {
      throw new DatabaseException(`Failed to retrieve platform setting: ${key}`, err);
    }
  }

  async set(key: string, value: any, tx?: Prisma.TransactionClient): Promise<PlatformSetting> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.platformSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    } catch (err) {
      throw new DatabaseException(`Failed to save platform setting: ${key}`, err);
    }
  }

  async delete(key: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma.client;
    try {
      await client.platformSetting.delete({
        where: { key },
      });
    } catch (err) {
      throw new DatabaseException(`Failed to delete platform setting: ${key}`, err);
    }
  }

  async listAll(tx?: Prisma.TransactionClient): Promise<PlatformSetting[]> {
    const client = tx ?? this.prisma.client;
    try {
      return await client.platformSetting.findMany({
        orderBy: { key: 'asc' },
      });
    } catch (err) {
      throw new DatabaseException('Failed to list all platform settings', err);
    }
  }
}
