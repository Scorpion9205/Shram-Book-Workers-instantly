import type { PlatformSetting, Prisma } from '@prisma/client';

export interface IPlatformSettingRepository {
  get(key: string, tx?: Prisma.TransactionClient): Promise<PlatformSetting | null>;
  set(key: string, value: any, tx?: Prisma.TransactionClient): Promise<PlatformSetting>;
  delete(key: string, tx?: Prisma.TransactionClient): Promise<void>;
  listAll(tx?: Prisma.TransactionClient): Promise<PlatformSetting[]>;
}
