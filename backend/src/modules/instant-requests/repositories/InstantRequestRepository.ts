import { BaseRepository } from '../../../core/base/BaseRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import type { Prisma, InstantRequest, InstantRequestItem, Booking } from '@prisma/client';
import type {
  IInstantRequestRepository,
  CreateInstantRequestData,
  CreateInstantRequestItemData,
  CreateInstantBookingData,
} from '../interfaces/IInstantRequestRepository.js';

export class InstantRequestRepository extends BaseRepository<InstantRequest> implements IInstantRequestRepository {
  constructor(private readonly prisma: PrismaService = PrismaService.getInstance()) {
    super();
  }

  async findExpiredOpenRequests(): Promise<{ id: string }[]> {
    return this.prisma.client.instantRequest.findMany({
      where: {
        status: 'OPEN',
        expiresAt: {
          lt: new Date(),
        },
      },
      select: {
        id: true,
      },
    });
  }

  async markExpired(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.prisma.client.instantRequest.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });
  }

  async upsertProviderProfile(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma.client;
    await client.providerProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async createRequest(data: CreateInstantRequestData, tx?: Prisma.TransactionClient): Promise<InstantRequest> {
    const client = tx ?? this.prisma.client;
    return client.instantRequest.create({ data });
  }

  async createRequestItems(items: CreateInstantRequestItemData[], tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma.client;
    await client.instantRequestItem.createMany({ data: items });
  }

  async findRequestWithItemsAndProvider(requestId: string, tx?: Prisma.TransactionClient): Promise<any | null> {
    const client = tx ?? this.prisma.client;
    return client.instantRequest.findUnique({
      where: { id: requestId },
      include: {
        provider: { select: { name: true } },
        items: { include: { skill: true } },
        skill: true,
      },
    });
  }

  async findRequestById(requestId: string, tx?: Prisma.TransactionClient): Promise<InstantRequest | null> {
    const client = tx ?? this.prisma.client;
    return client.instantRequest.findUnique({ where: { id: requestId } });
  }

  async findRequestsByProvider(providerId: string): Promise<any[]> {
    return this.prisma.client.instantRequest.findMany({
      where: { providerId },
      select: {
        id: true,
        title: true,
        amount: true,
        status: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            requiredWorkers: true,
            acceptedWorkers: true,
            skill: { select: { name: true } },
            responses: {
              select: {
                status: true,
                worker: {
                  select: {
                    user: { select: { name: true, phone: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findProviderProfileByUserId(userId: string): Promise<{ userId: string } | null> {
    return this.prisma.client.providerProfile.findUnique({
      where: { userId },
      select: { userId: true },
    });
  }

  async findWorkerWithSkills(userId: string, tx?: Prisma.TransactionClient): Promise<any | null> {
    const client = tx ?? this.prisma.client;
    return client.workerProfile.findUnique({
      where: { userId },
      include: { skills: true },
    });
  }

  async findWorkerWithSkillsAndUser(userId: string, tx?: Prisma.TransactionClient): Promise<any | null> {
    const client = tx ?? this.prisma.client;
    return client.workerProfile.findUnique({
      where: { userId },
      include: { skills: true, user: true },
    });
  }

  async findOpenNearbyRequestsForSkills(skillIds: string[]): Promise<any[]> {
    return this.prisma.client.instantRequest.findMany({
      where: {
        status: 'OPEN',
        expiresAt: { gt: new Date() },
        items: {
          some: {
            skillId: { in: skillIds },
            status: 'OPEN',
          },
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        amount: true,
        address: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        provider: { select: { name: true } },
        items: {
          where: {
            skillId: { in: skillIds },
            status: 'OPEN',
          },
          select: {
            id: true,
            requiredWorkers: true,
            acceptedWorkers: true,
            skill: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findEligibleWorkersForMatching(workerIds: string[], skillId: string): Promise<any[]> {
    return this.prisma.client.workerProfile.findMany({
      where: {
        id: { in: workerIds },
        isAvailable: true,
        user: { role: 'WORKER' },
        skills: {
          some: { skillId },
        },
      },
      include: { user: true },
    });
  }

  async findRequestItemWithRequest(itemId: string, tx?: Prisma.TransactionClient): Promise<any | null> {
    const client = tx ?? this.prisma.client;
    return client.instantRequestItem.findUnique({
      where: { id: itemId },
      include: { request: true },
    });
  }

  async findResponseByItemAndWorker(itemId: string, workerId: string, tx?: Prisma.TransactionClient): Promise<any | null> {
    const client = tx ?? this.prisma.client;
    return client.instantRequestResponse.findFirst({
      where: { itemId, workerId },
    });
  }

  async createResponse(itemId: string, workerId: string, tx?: Prisma.TransactionClient): Promise<{ id: string }> {
    const client = tx ?? this.prisma.client;
    return client.instantRequestResponse.create({
      data: { itemId, workerId, status: 'ACCEPTED' },
    });
  }

  async incrementAcceptedWorkersIfSlotAvailable(
    itemId: string,
    requiredWorkers: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma.client;
    const result = await client.instantRequestItem.updateMany({
      where: {
        id: itemId,
        acceptedWorkers: { lt: requiredWorkers },
      },
      data: {
        acceptedWorkers: { increment: 1 },
      },
    });
    return result.count;
  }

  async findItemById(itemId: string, tx?: Prisma.TransactionClient): Promise<InstantRequestItem | null> {
    const client = tx ?? this.prisma.client;
    return client.instantRequestItem.findUnique({ where: { id: itemId } });
  }

  async markItemFilled(itemId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma.client;
    await client.instantRequestItem.update({
      where: { id: itemId },
      data: { status: 'FILLED' },
    });
  }

  async countOpenItemsForRequest(requestId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx ?? this.prisma.client;
    return client.instantRequestItem.count({
      where: { requestId, status: 'OPEN' },
    });
  }

  async markRequestFilled(requestId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma.client;
    await client.instantRequest.update({
      where: { id: requestId },
      data: { status: 'FILLED' },
    });
  }

  async createBooking(data: CreateInstantBookingData, tx?: Prisma.TransactionClient): Promise<Booking> {
    const client = tx ?? this.prisma.client;
    return client.booking.create({
      data: {
        providerId: data.providerId,
        workerId: data.workerId,
        instantRequestId: data.instantRequestId,
        instantRequestResponseId: data.instantRequestResponseId ?? null,
        amount: data.amount,
        status: data.status as any,
        startOtp: data.startOtp,
      },
    });
  }

  async markWorkerUnavailable(workerId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma.client;
    await client.workerProfile.update({
      where: { id: workerId },
      data: { isAvailable: false },
    });
  }

  async findWorkerSkillIds(workerId: string, tx?: Prisma.TransactionClient): Promise<string[]> {
    const client = tx ?? this.prisma.client;
    const skills = await client.workerSkill.findMany({ where: { workerId } });
    return skills.map((s) => s.skillId);
  }

  async upsertBid(requestId: string, workerId: string, bidAmount: number, tx?: Prisma.TransactionClient): Promise<any> {
    const client = tx ?? this.prisma.client;
    return client.instantRequestBid.upsert({
      where: {
        instantRequestId_workerId: {
          instantRequestId: requestId,
          workerId,
        },
      },
      create: {
        instantRequestId: requestId,
        workerId,
        bidAmount,
        status: 'ACTIVE',
      },
      update: {
        bidAmount,
        status: 'ACTIVE',
      },
      include: {
        worker: { include: { user: true } },
      },
    });
  }

  async findBidById(bidId: string, tx?: Prisma.TransactionClient): Promise<any | null> {
    const client = tx ?? this.prisma.client;
    return client.instantRequestBid.findUnique({
      where: { id: bidId },
      include: { worker: { include: { user: true } } },
    });
  }

  async markBidSelected(bidId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma.client;
    await client.instantRequestBid.update({
      where: { id: bidId },
      data: { status: 'SELECTED' },
    });
  }

  async rejectOtherBids(requestId: string, exceptBidId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma.client;
    await client.instantRequestBid.updateMany({
      where: {
        instantRequestId: requestId,
        id: { not: exceptBidId },
      },
      data: { status: 'REJECTED' },
    });
  }
}
