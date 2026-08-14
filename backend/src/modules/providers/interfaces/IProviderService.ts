import type { ProviderProfile } from '@prisma/client';

export interface IProviderService {
  createProfile(
    userId: string,
    data: { providerType?: any; companyName?: string | null | undefined; description?: string | null | undefined },
  ): Promise<ProviderProfile>;
  getMyProfile(userId: string): Promise<ProviderProfile>;
  updateProfile(
    userId: string,
    data: { providerType?: any; companyName?: string | null | undefined; description?: string | null | undefined },
  ): Promise<ProviderProfile>;
}
