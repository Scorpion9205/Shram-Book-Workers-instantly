import type { Job, Prisma } from '@prisma/client';

export interface JobListFilter {
  search?: string;
  category?: string; // skillId
  minSalary?: number;
  maxSalary?: number;
  sort?: 'latest' | 'highest_salary' | 'nearest' | 'highest_rated';
}

export interface IJobRepository {
  findById(id: string, tx?: Prisma.TransactionClient): Promise<Job | null>;
  create(data: Prisma.JobUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<Job>;
  findManyOpenBySkillIds(skillIds: string[], filter?: JobListFilter, tx?: Prisma.TransactionClient): Promise<any[]>;
  update(id: string, data: Prisma.JobUpdateInput, tx?: Prisma.TransactionClient): Promise<Job>;
  findManyByProviderId(providerId: string, tx?: Prisma.TransactionClient): Promise<any[]>;
}
