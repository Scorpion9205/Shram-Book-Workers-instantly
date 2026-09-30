import type { Prisma, InstantRequest, InstantRequestItem, InstantRequestBid, WorkerProfile, Booking } from '@prisma/client';

export interface CreateInstantRequestData {
  providerId: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  amount: number;
  bookingMode: 'DIRECT' | 'BIDDING';
  skillId: string | null;
  expiresAt: Date;
}

export interface CreateInstantRequestItemData {
  requestId: string;
  skillId: string;
  requiredWorkers: number;
}

export interface CreateInstantBookingData {
  providerId: string;
  workerId: string;
  instantRequestId: string;
  instantRequestResponseId?: string;
  amount: Prisma.Decimal | number;
  status: string;
  startOtp: string;
}

export interface IInstantRequestRepository {
  // Legacy — used by the expired-request cleanup cron job.
  findExpiredOpenRequests(): Promise<{ id: string }[]>;
  markExpired(ids: string[]): Promise<void>;

  upsertProviderProfile(userId: string, tx?: Prisma.TransactionClient): Promise<void>;
  createRequest(data: CreateInstantRequestData, tx?: Prisma.TransactionClient): Promise<InstantRequest>;
  createRequestItems(items: CreateInstantRequestItemData[], tx?: Prisma.TransactionClient): Promise<void>;
  findRequestWithItemsAndProvider(requestId: string, tx?: Prisma.TransactionClient): Promise<any | null>;
  findRequestById(requestId: string, tx?: Prisma.TransactionClient): Promise<InstantRequest | null>;
  findRequestsByProvider(providerId: string): Promise<any[]>;
  findProviderProfileByUserId(userId: string): Promise<{ userId: string } | null>;

  findWorkerWithSkills(userId: string, tx?: Prisma.TransactionClient): Promise<any | null>;
  findWorkerWithSkillsAndUser(userId: string, tx?: Prisma.TransactionClient): Promise<any | null>;
  findOpenNearbyRequestsForSkills(skillIds: string[]): Promise<any[]>;
  findEligibleWorkersForMatching(workerIds: string[], skillId: string): Promise<any[]>;

  findRequestItemWithRequest(itemId: string, tx?: Prisma.TransactionClient): Promise<any | null>;
  findResponseByItemAndWorker(itemId: string, workerId: string, tx?: Prisma.TransactionClient): Promise<any | null>;
  createResponse(itemId: string, workerId: string, tx?: Prisma.TransactionClient): Promise<{ id: string }>;
  incrementAcceptedWorkersIfSlotAvailable(
    itemId: string,
    requiredWorkers: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;
  findItemById(itemId: string, tx?: Prisma.TransactionClient): Promise<InstantRequestItem | null>;
  markItemFilled(itemId: string, tx?: Prisma.TransactionClient): Promise<void>;
  countOpenItemsForRequest(requestId: string, tx?: Prisma.TransactionClient): Promise<number>;
  markRequestFilled(requestId: string, tx?: Prisma.TransactionClient): Promise<void>;

  createBooking(data: CreateInstantBookingData, tx?: Prisma.TransactionClient): Promise<Booking>;
  markWorkerUnavailable(workerId: string, tx?: Prisma.TransactionClient): Promise<void>;
  findWorkerSkillIds(workerId: string, tx?: Prisma.TransactionClient): Promise<string[]>;

  upsertBid(
    requestId: string,
    workerId: string,
    bidAmount: number,
    tx?: Prisma.TransactionClient,
  ): Promise<InstantRequestBid & { worker: WorkerProfile & { user: { name: string; isActive: boolean } } }>;
  findBidById(bidId: string, tx?: Prisma.TransactionClient): Promise<any | null>;
  markBidSelected(bidId: string, tx?: Prisma.TransactionClient): Promise<void>;
  rejectOtherBids(requestId: string, exceptBidId: string, tx?: Prisma.TransactionClient): Promise<void>;
}
