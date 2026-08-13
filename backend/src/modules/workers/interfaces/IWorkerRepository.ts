import type { WorkerProfile, Prisma } from '@prisma/client';

export interface IWorkerRepository {
  findByUserId(userId: string, tx?: Prisma.TransactionClient): Promise<WorkerProfile | null>;
  findById(id: string, tx?: Prisma.TransactionClient): Promise<WorkerProfile | null>;
  createProfile(
    userId: string,
    data: { bio?: string | null | undefined; experience: number; dailyRate?: number | null | undefined },
    tx?: Prisma.TransactionClient,
  ): Promise<WorkerProfile>;
  updateProfile(
    userId: string,
    data: { bio?: string | null | undefined; experience?: number | undefined; dailyRate?: number | null | undefined },
    tx?: Prisma.TransactionClient,
  ): Promise<WorkerProfile>;
  updateAvailability(
    userId: string,
    isAvailable: boolean,
    tx?: Prisma.TransactionClient,
  ): Promise<WorkerProfile>;
  getProfileWithSkillsAndUser(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<any>;
}
