import type { ProviderProfile, Prisma } from '@prisma/client';

export interface IProviderRepository {
  findByUserId(userId: string, tx?: Prisma.TransactionClient): Promise<ProviderProfile | null>;
  createProfile(
    userId: string,
    data: { providerType?: any; companyName?: string | null | undefined; description?: string | null | undefined },
    tx?: Prisma.TransactionClient,
  ): Promise<ProviderProfile>;
  updateProfile(
    userId: string,
    data: { providerType?: any; companyName?: string | null | undefined; description?: string | null | undefined },
    tx?: Prisma.TransactionClient,
  ): Promise<ProviderProfile>;
}
