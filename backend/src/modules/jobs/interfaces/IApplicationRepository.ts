import type { Application, Prisma } from '@prisma/client';

export interface IApplicationRepository {
  create(data: Prisma.ApplicationUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<Application>;
  findByJobAndWorker(jobId: string, workerId: string, tx?: Prisma.TransactionClient): Promise<Application | null>;
  findManyByJobId(jobId: string, tx?: Prisma.TransactionClient): Promise<any[]>;
  findById(id: string, tx?: Prisma.TransactionClient): Promise<any | null>;
  update(id: string, data: Prisma.ApplicationUpdateInput, tx?: Prisma.TransactionClient): Promise<Application>;
  updateManyPendingToRejected(jobId: string, tx?: Prisma.TransactionClient): Promise<void>;
  findManyByWorkerId(workerId: string, tx?: Prisma.TransactionClient): Promise<any[]>;
}
