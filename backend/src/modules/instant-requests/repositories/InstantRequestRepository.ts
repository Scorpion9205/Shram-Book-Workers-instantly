import { BaseRepository } from '../../../core/base/BaseRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import type { Prisma, InstantRequest, InstantRequestItem, Booking } from '@prisma/client';
import type {
  IInstantRequestRepository,
  CreateInstantRequestData,
  CreateInstantRequestItemData,
  CreateInstantBookingData,
} from '../interfaces/IInstantRequestRepository.js';

// Prisma queries for instant requests: the request, its per-skill items, worker responses,
// bids, and the bookings created from them. Many methods are small "conditional update"
// helpers (they return how many rows changed) because the service uses them to win races.
export class InstantRequestRepository extends BaseRepository<InstantRequest> implements IInstantRequestRepository {
  constructor(private readonly prisma: PrismaService = PrismaService.getInstance()) {
    super();
  }

  // Create the provider profile row if it doesn't exist yet.
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

  // A request together with its items (and their skills) and the provider's name.
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

  // The provider's request history, including who accepted each slot.
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

  // Ids of every OPEN request - used on server startup to restart matching loops.
  async findAllOpenRequestIds(): Promise<string[]> {
    const rows = await this.prisma.client.instantRequest.findMany({
      where: { status: 'OPEN' },
      select: { id: true },
    });
    return rows.map((r) => r.id);
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

  // Open, not-yet-expired requests that still have an open slot for any of these skills.
  // Only the matching items are returned. (Distance is filtered later in the service.)
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
            skill: { select: { id: true, name: true, baseRate: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Every worker who can be offered a request for this skill: available, account active, and
  // having the skill. No distance filter for now. Includes the user (for the websocket room id)
  // and the worker's last known coordinates (used to show distance/ETA on the popup).
  async findEligibleWorkersBySkill(skillId: string): Promise<any[]> {
    return this.prisma.client.workerProfile.findMany({
      where: {
        isAvailable: true,
        user: { role: 'WORKER', isActive: true },
        skills: { some: { skillId } },
      },
      include: { user: true },
    });
  }

  async findRequestItemWithRequest(itemId: string, tx?: Prisma.TransactionClient): Promise<any | null> {
    const client = tx ?? this.prisma.client;
    return client.instantRequestItem.findUnique({
      where: { id: itemId },
      include: { request: true, skill: true },
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

  // Adds one accepted worker to an item, but only while acceptedWorkers < requiredWorkers.
  // Returns 1 if a slot was taken, 0 if the item was already full.
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

  // Changes the status only if the request is still OPEN (used for cancel). Returns rows changed.
  async updateStatusIfOpen(requestId: string, toStatus: string, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx ?? this.prisma.client;
    const result = await client.instantRequest.updateMany({
      where: { id: requestId, status: 'OPEN' },
      data: { status: toStatus as any },
    });
    return result.count;
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
        workAmount: data.workAmount ?? null,
        agentAmount: data.agentAmount ?? null,
        status: data.status as any,
        startOtp: data.startOtp,
        agentId: data.agentId ?? null,
        // Instant bookings are always paid directly (cash/UPI); the app collects nothing online.
        // This matters: with the default ONLINE mode the wallet consumer would assume the
        // platform holds the money and credit the worker for cash it never received.
        paymentMode: 'OFFLINE',
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

  // "Claim" a worker: flips isAvailable to false only if it's currently true.
  // Returns 1 if we got them, 0 if someone else did first - the key to preventing double-booking.
  async markWorkerUnavailableIfAvailable(workerId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx ?? this.prisma.client;
    const result = await client.workerProfile.updateMany({
      where: { id: workerId, isAvailable: true },
      data: { isAvailable: false },
    });
    return result.count;
  }

  async findWorkerSkillIds(workerId: string, tx?: Prisma.TransactionClient): Promise<string[]> {
    const client = tx ?? this.prisma.client;
    const skills = await client.workerSkill.findMany({ where: { workerId } });
    return skills.map((s) => s.skillId);
  }

  // One bid per worker per request: bidding again updates the existing bid.
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

  // After a winner is chosen, every other bid on the request is marked REJECTED.
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
