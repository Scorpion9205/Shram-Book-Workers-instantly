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
  /**
   * Atomically moves an InstantRequest to `toStatus` only if it is still OPEN. Returns the
   * affected row count (0 = it was already FILLED/CANCELLED by something else — e.g. a
   * worker accepted in the same instant the Provider clicked Cancel).
   */
  updateStatusIfOpen(requestId: string, toStatus: string, tx?: Prisma.TransactionClient): Promise<number>;

  createBooking(data: CreateInstantBookingData, tx?: Prisma.TransactionClient): Promise<Booking>;
  markWorkerUnavailable(workerId: string, tx?: Prisma.TransactionClient): Promise<void>;
  /**
   * Atomically flips isAvailable true -> false only if it is still true. Returns the number
   * of rows affected (0 = another concurrent accept/selectBid already claimed this worker).
   * This is what actually prevents one worker from being booked onto two jobs at once —
   * the Redis lock alone only prevents two callers from racing on the SAME item/request,
   * not a single worker being claimed by two DIFFERENT items/requests concurrently.
   */
  markWorkerUnavailableIfAvailable(workerId: string, tx?: Prisma.TransactionClient): Promise<number>;
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
