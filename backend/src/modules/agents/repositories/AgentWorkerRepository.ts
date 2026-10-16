import { Prisma, UserRole } from '@prisma/client';
import { BaseRepository } from '../../../core/base/BaseRepository.js';
import type {
  IAgentWorkerRepository,
  AgentWorkerRosterEntry,
  AgentWorkerLink,
  CreateManagedWorkerInput,
} from '../interfaces/IAgentWorkerRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { ConflictException, DatabaseException, NotFoundException } from '../../../core/exceptions/index.js';

// What we load for each roster entry: the worker, their basic user info and their skills.
const rosterInclude = {
  worker: {
    include: {
      user: { select: { id: true, name: true, phone: true, isActive: true } },
      skills: { include: { skill: true } },
    },
  },
} satisfies Prisma.AgentWorkerInclude;

// Flattens the Prisma result into the clean shape the API returns (Decimals -> numbers,
// bank columns grouped under bankDetails).
function toRosterEntry(row: Prisma.AgentWorkerGetPayload<{ include: typeof rosterInclude }>): AgentWorkerRosterEntry {
  return {
    id: row.id,
    workerId: row.workerId,
    verifiedByAgent: row.verifiedByAgent,
    createdAt: row.createdAt,
    worker: {
      id: row.worker.id,
      userId: row.worker.userId,
      isAvailable: row.worker.isAvailable,
      dailyRate: row.worker.dailyRate !== null ? Number(row.worker.dailyRate) : null,
      latitude: row.worker.latitude !== null ? Number(row.worker.latitude) : null,
      longitude: row.worker.longitude !== null ? Number(row.worker.longitude) : null,
      user: row.worker.user,
      skills: row.worker.skills.map((s) => ({ skillId: s.skillId, skill: { id: s.skill.id, name: s.skill.name } })),
      bankDetails: {
        accountHolderName: row.worker.bankAccountHolderName,
        accountNumber: row.worker.bankAccountNumber,
        ifscCode: row.worker.bankIfscCode,
        bankName: row.worker.bankName,
      },
    },
  };
}

// Prisma queries for the agent<->worker roster (the AgentWorker link table and the worker
// accounts the agent creates).
export class AgentWorkerRepository extends BaseRepository<any> implements IAgentWorkerRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // Size of the roster (dashboard counter).
  async countByAgentId(agentId: string): Promise<number> {
    return this.prisma.client.agentWorker.count({
      where: { agentId },
    });
  }

  // How many roster workers are currently marked available.
  async countAvailableByAgentId(agentId: string): Promise<number> {
    return this.prisma.client.agentWorker.count({
      where: {
        agentId,
        worker: {
          isAvailable: true,
        },
      },
    });
  }

  async findManyByAgentId(agentId: string): Promise<AgentWorkerRosterEntry[]> {
    const rows = await this.prisma.client.agentWorker.findMany({
      where: { agentId },
      include: rosterInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toRosterEntry);
  }

  // Looks up one agent<->worker link. Used as the "does this worker belong to this agent?" check.
  async findLinkByAgentAndWorker(agentId: string, workerId: string): Promise<AgentWorkerLink | null> {
    const row = await this.prisma.client.agentWorker.findUnique({
      where: { agentId_workerId: { agentId, workerId } },
      include: { worker: { select: { userId: true } } },
    });
    if (!row) return null;
    return {
      id: row.id,
      agentId: row.agentId,
      workerId: row.workerId,
      verifiedByAgent: row.verifiedByAgent,
      worker: { userId: row.worker.userId },
    };
  }

  // Creates user + worker profile + skills + roster link in ONE transaction, so we never end
  // up with a half-created worker. No password/OTP involved: the agent operates the account.
  async createManagedWorker(agentId: string, data: CreateManagedWorkerInput): Promise<AgentWorkerRosterEntry> {
    try {
      const link = await this.prisma.client.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: data.name,
            phone: data.phone ?? null,
            role: UserRole.WORKER,
            isVerified: false,
          },
        });

        const worker = await tx.workerProfile.create({
          data: {
            userId: user.id,
            experience: 0,
            dailyRate: data.dailyRate ?? null,
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
            // The column defaults to true, but a brand-new worker isn't in the Redis GEO index
            // yet, so "available" would be a lie. The agent switches them on when the worker
            // actually reports in.
            isAvailable: false,
          },
        });

        if (data.skillIds.length > 0) {
          await tx.workerSkill.createMany({
            data: data.skillIds.map((skillId) => ({ workerId: worker.id, skillId })),
          });
        }

        return tx.agentWorker.create({
          data: { agentId, workerId: worker.id },
          include: rosterInclude,
        });
      });

      return toRosterEntry(link);
    } catch (err) {
      // P2002 = unique constraint hit, which here can only be the phone number.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A worker with this phone number already exists');
      }
      throw new DatabaseException('Failed to create managed worker', err);
    }
  }

  // Toggles the agent's own trust flag on a roster worker.
  async setVerified(agentId: string, workerId: string, verified: boolean): Promise<AgentWorkerRosterEntry> {
    try {
      const row = await this.prisma.client.agentWorker.update({
        where: { agentId_workerId: { agentId, workerId } },
        data: { verifiedByAgent: verified },
        include: rosterInclude,
      });
      return toRosterEntry(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('AgentWorker', workerId);
      }
      throw new DatabaseException('Failed to update worker verification status', err);
    }
  }

  // Saves bank details on the worker profile, then re-reads the roster entry so the caller
  // gets the fresh, complete record back.
  async setWorkerBankDetails(
    workerId: string,
    data: { accountHolderName: string; accountNumber: string; ifscCode: string; bankName: string },
  ): Promise<AgentWorkerRosterEntry> {
    try {
      await this.prisma.client.workerProfile.update({
        where: { id: workerId },
        data: {
          bankAccountHolderName: data.accountHolderName,
          bankAccountNumber: data.accountNumber,
          bankIfscCode: data.ifscCode,
          bankName: data.bankName,
        },
      });

      const link = await this.prisma.client.agentWorker.findFirst({
        where: { workerId },
        include: rosterInclude,
      });
      if (!link) {
        throw new NotFoundException('AgentWorker', workerId);
      }
      return toRosterEntry(link);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('WorkerProfile', workerId);
      }
      throw new DatabaseException('Failed to update worker bank details', err);
    }
  }

  // Removes only the roster link; the worker's user account is handled separately.
  async deleteLink(agentId: string, workerId: string): Promise<void> {
    try {
      await this.prisma.client.agentWorker.delete({
        where: { agentId_workerId: { agentId, workerId } },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('AgentWorker', workerId);
      }
      throw new DatabaseException('Failed to remove worker from roster', err);
    }
  }
}
