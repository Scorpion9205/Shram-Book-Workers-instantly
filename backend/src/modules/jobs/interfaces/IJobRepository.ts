import type { Job, Prisma } from '@prisma/client';

export interface IJobRepository {
  findById(id: string, tx?: Prisma.TransactionClient): Promise<Job | null>;
  create(data: Prisma.JobUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<Job>;
  findManyOpenBySkillIds(skillIds: string[], tx?: Prisma.TransactionClient): Promise<any[]>;
  update(id: string, data: Prisma.JobUpdateInput, tx?: Prisma.TransactionClient): Promise<Job>;
  findManyByProviderId(providerId: string, tx?: Prisma.TransactionClient): Promise<any[]>;
}
