import type { WorkerProfile } from '@prisma/client';

export interface IWorkerService {
  createProfile(
    userId: string,
    data: { bio?: string | null | undefined; experience: number; dailyRate?: number | null | undefined },
  ): Promise<WorkerProfile>;
  getMyProfile(userId: string): Promise<any>;
  updateProfile(
    userId: string,
    data: { bio?: string | null | undefined; experience?: number | undefined; dailyRate?: number | null | undefined },
  ): Promise<WorkerProfile>;
  updateAvailability(
    userId: string,
    isAvailable: boolean,
  ): Promise<WorkerProfile>;
}
