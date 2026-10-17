import { BookingStatus } from "@prisma/client";
import type { CreateInstantRequestInput } from "../validations/instant-request.validation.js";
import { FareService } from "../../../shared/services/pricing/fare.service.js";
import { getIO } from "../../../socket/socket.js";
import { calculateDistance } from "../../../shared/utils/distance.js";
import { CacheInvalidationService } from "../../../shared/services/cache/cache-invalidation.service.js";
import {
  generateHashedStartOtp,
  bookingStartOtpCacheKey,
  BOOKING_START_OTP_CACHE_TTL_SECONDS,
} from "../../../shared/utils/booking-otp.util.js";
import { PrismaService } from "../../../database/prisma/PrismaService.js";
import type { ICacheService } from "../../../core/interfaces/ICacheService.js";
import type { IEventPublisher } from "../../../core/interfaces/IEventPublisher.js";
import { RoutingKeys } from "../../../infrastructure/queue/queue.constants.js";
import type { IBookingHistoryRepository } from "../../bookings/interfaces/IBookingHistoryRepository.js";
import type { IInstantRequestRepository } from "../interfaces/IInstantRequestRepository.js";
import type { IInstantMatchingService } from "../interfaces/IInstantMatchingService.js";
import type { IInstantRequestService } from "../interfaces/IInstantRequestService.js";
import { Logger } from "../../../core/logger/Logger.js";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  BusinessException,
} from "../../../core/exceptions/index.js";

/**
 * "Uber-style" instant hiring. A provider posts a request ("1 plumber + 2 helpers, now"),
 * nearby workers are notified, and the slots get filled either by direct accept (first
 * worker wins) or by bidding (provider picks a bid). Agents can also fill slots from
 * their roster.
 *
 * The tricky part is concurrency: many workers can try to take the same slot at once, so
 * accepting uses a Redis lock plus atomic DB updates to make sure each slot goes to
 * exactly one worker and no worker is booked twice.
 */
export class InstantRequestService implements IInstantRequestService {
  private readonly logger = new Logger('InstantRequestService');

  constructor(
    private readonly requestRepo: IInstantRequestRepository,
    private readonly cache: ICacheService,
    private readonly prisma: PrismaService,
    private readonly matchingService: IInstantMatchingService,
    private readonly historyRepo: IBookingHistoryRepository,
    private readonly eventPublisher: IEventPublisher,
  ) {}

  // Provider posts a new instant request. The request and its per-skill items are created in
  // one transaction; matching (notifying nearby workers) then starts in the background.
  async createInstantRequest(userId: string, data: CreateInstantRequestInput) {
    // Make sure the provider has a profile row before we reference them.
    await this.requestRepo.upsertProviderProfile(userId);

    const { title, description, latitude, longitude, address, amount, items, bookingMode } = data;

    const createdRequest = await this.prisma.transaction(async (tx) => {
      const fare = await FareService.calculateInstantFare(items);

      const request = await this.requestRepo.createRequest(
        {
          providerId: userId,
          title,
          description: description ?? null,
          latitude,
          longitude,
          address: address ?? null,
          // The controller already replaced `amount` with the price from the fare quote.
          amount: amount ?? fare.total,
          bookingMode,
          // The request itself keeps the first item's skill as a "main" skill for display.
          skillId: items[0]?.skillId || null,
          // Requests auto-expire after 30 minutes if nobody takes them.
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
        tx,
      );

      await this.requestRepo.createRequestItems(
        items.map((item) => ({
          requestId: request.id,
          skillId: item.skillId,
          requiredWorkers: item.requiredWorkers,
        })),
        tx,
      );

      const full = await this.requestRepo.findRequestWithItemsAndProvider(request.id, tx);
      if (!full) {
        throw new NotFoundException("InstantRequest");
      }
      return full;
    });

    // Fire-and-forget: matching keeps running after we respond (it widens the search radius
    // step by step). Errors are logged instead of failing the request creation.
    this.matchingService.startMatching(createdRequest.id).catch((err) => {
      this.logger.error('Async matching orchestrator error', err);
    });

    return createdRequest;
  }

  // Worker's "requests near me" list: open requests that need one of their skills and are
  // within 10 km, nearest first. Cached for a minute per worker.
  async getNearbyRequests(userId: string) {
    const cacheKey = `requests:nearby:${userId}`;

    const cachedRequests = await this.cache.get<any>(cacheKey);
    if (cachedRequests) {
      return cachedRequests;
    }

    const worker = await this.requestRepo.findWorkerWithSkills(userId);
    if (!worker) {
      throw new NotFoundException("WorkerProfile", userId);
    }

    // A worker with no saved location is treated as being at (0, 0), so nothing will be "nearby".
    const workerLocation = {
      latitude: Number(worker.latitude ?? 0),
      longitude: Number(worker.longitude ?? 0),
    };

    const skillIds = worker.skills.map((workerSkill: any) => workerSkill.skillId);

    if (skillIds.length === 0) {
      return [];
    }

    const requests = await this.requestRepo.findOpenNearbyRequestsForSkills(skillIds);

    const SEARCH_RADIUS_KM = 10;

    const nearbyRequests = requests
      .map((request: any) => {
        const distance = calculateDistance(
          workerLocation.latitude,
          workerLocation.longitude,
          request.latitude,
          request.longitude,
        );

        return {
          ...request,
          distanceKm: Number(distance.toFixed(2)),
        };
      })
      .filter((request: any) => request.distanceKm <= SEARCH_RADIUS_KM)
      .sort((a: any, b: any) => a.distanceKm - b.distanceKm);

    await this.cache.set(cacheKey, nearbyRequests, 60);

    return nearbyRequests;
  }

  // A worker taps "accept" on one slot (item) of a DIRECT request. First valid accept wins.
  async acceptRequest(userId: string, itemId: string) {
    const worker = await this.requestRepo.findWorkerWithSkills(userId);

    if (!worker) {
      throw new NotFoundException("WorkerProfile", userId);
    }
    if (!worker.isAvailable) {
      throw new BusinessException("WORKER_UNAVAILABLE", "Worker is not available for bookings");
    }

    // Only one accept per item may run at a time. Everyone else who tries while the lock is
    // held gets an immediate "someone else is accepting" error (the lock auto-expires in 15s
    // in case the server crashes mid-way).
    const lockKey = `lock:instant-item:${itemId}`;
    const lockToken = await this.cache.acquireLock(lockKey, 15);

    if (!lockToken) {
      throw new BusinessException("CONCURRENT_LOCK", "Another worker is already accepting this request.");
    }

    try {
      // Hashing is the slowest single step on a small server, so do it here (lock held, no DB
      // transaction open yet) rather than inside the transaction.
      const { code: startOtpPlain, hash: startOtp } = await generateHashedStartOtp();

      const result = await this.prisma.transaction(async (tx) => {
        const item = await this.requestRepo.findRequestItemWithRequest(itemId, tx);

        if (!item) {
          throw new NotFoundException("InstantRequestItem", itemId);
        }

        // Bidding-mode requests are filled by the provider picking a bid, not by accepting.
        if (item.request.bookingMode !== "DIRECT") {
          throw new BadRequestException("This request does not support direct accept");
        }

        if (item.request.status !== "OPEN") {
          throw new BusinessException("REQUEST_CLOSED", "Request is closed");
        }

        const hasSkill = worker.skills.some((skill: any) => skill.skillId === item.skillId);

        if (!hasSkill) {
          throw new BadRequestException("You don't have required skill");
        }

        const alreadyAccepted = await this.requestRepo.findResponseByItemAndWorker(itemId, worker.id, tx);

        if (alreadyAccepted) {
          throw new BusinessException("ALREADY_ACCEPTED", "You already accepted this request");
        }

        if (item.acceptedWorkers >= item.requiredWorkers) {
          throw new BusinessException("SLOTS_FILLED", "All slots are filled");
        }

        // Record the accept, then create the booking with a fresh start OTP (hash in DB,
        // plaintext cached for the provider to read out when the worker arrives).
        const response = await this.requestRepo.createResponse(itemId, worker.id, tx);


        const booking = await this.requestRepo.createBooking(
          {
            providerId: item.request.providerId,
            workerId: worker.id,
            instantRequestId: item.request.id,
            instantRequestResponseId: response.id,
            amount: item.request.amount,
            status: BookingStatus.WORKER_ASSIGNED,
            startOtp,
          },
          tx,
        );

        // The booking row was written directly (not via BookingStateService), so add its first
        // audit-history entry by hand. We can't use BookingStateService here: instant bookings
        // skip the payment steps, so CREATED -> WORKER_ASSIGNED isn't a legal transition there.
        await this.historyRepo.append(
          {
            bookingId: booking.id,
            fromStatus: BookingStatus.CREATED,
            toStatus: BookingStatus.WORKER_ASSIGNED,
            changedBy: userId,
            reason: 'Instant request accepted directly by worker',
          },
          tx,
        );

        // Mark the worker busy, but only if they're still free (one conditional UPDATE).
        // The Redis lock above only protects this one slot; this is what stops the same worker
        // from being booked on two different requests at the same moment.
        const workerClaimed = await this.requestRepo.markWorkerUnavailableIfAvailable(worker.id, tx);
        if (workerClaimed === 0) {
          throw new BusinessException("WORKER_UNAVAILABLE", "You have just been booked on another job");
        }

        // Take one slot with a conditional UPDATE (only if acceptedWorkers < requiredWorkers),
        // so the count can never go past the number of workers requested.
        const updateCount = await this.requestRepo.incrementAcceptedWorkersIfSlotAvailable(
          itemId,
          item.requiredWorkers,
          tx,
        );

        if (updateCount === 0) {
          throw new BusinessException("SLOTS_FILLED", "All slots are already filled");
        }

        const updatedItem = await this.requestRepo.findItemById(itemId, tx);

        if (!updatedItem) {
          throw new NotFoundException("InstantRequestItem", itemId);
        }

        // Item full -> mark it FILLED. If that was the last open item, the whole request is FILLED.
        if (updatedItem.acceptedWorkers >= updatedItem.requiredWorkers) {
          await this.requestRepo.markItemFilled(itemId, tx);
        }

        const openItems = await this.requestRepo.countOpenItemsForRequest(item.requestId, tx);

        if (openItems === 0) {
          await this.requestRepo.markRequestFilled(item.requestId, tx);
        }

        // The item as it looks now, without another DB read.
        const finalItem = {
          ...updatedItem,
          status: updatedItem.acceptedWorkers >= updatedItem.requiredWorkers ? "FILLED" : updatedItem.status,
        };

        return {
          item: finalItem,
          providerUserId: item.request.providerId,
          workerUserId: worker.userId,
          bookingId: booking.id,
          booking,
        };
      });

      // Redis housekeeping after the DB work is done (kept out of the transaction so it stays
      // short): remember the plaintext start OTP for the provider, and take the now-busy worker
      // out of every skill's GEO index. These run in parallel.
      await Promise.all([
        this.cache.set(bookingStartOtpCacheKey(result.bookingId), startOtpPlain, BOOKING_START_OTP_CACHE_TTL_SECONDS),
        ...worker.skills.map((sk: any) => this.cache.geoRemove(`geo:instant-workers:${sk.skillId}`, worker.id)),
      ]);

      // Cached lists for both people are stale now.
      await CacheInvalidationService.afterInstantRequestAccepted(result.providerUserId, result.workerUserId);

      // Queue the email/SMS/push notifications, which still reach people whose app is closed.
      await this.eventPublisher.publish(RoutingKeys.BOOKING_CREATED, result.booking);

      // Live websocket update on top of that. Best effort only: the booking is already saved,
      // so a socket problem must not make the whole request fail.
      try {
        const io = getIO();
        io.to(`user:${result.providerUserId}`).emit("bookingUpdated", {
          id: result.bookingId,
          status: "accepted",
          workerId: worker.id,
          requestId: result.item?.requestId,
          itemId,
        });
        io.to(`user:${result.workerUserId}`).emit("instant-request:matched");
      } catch (err) {
        this.logger.debug("Skipped accept socket emit — socket not initialized", { itemId });
      }

      return {
        ...result.item,
        bookingId: result.bookingId,
      };
    } finally {
      // Always release the lock, whether the accept succeeded or threw.
      await this.cache.releaseLock(lockKey, lockToken);
    }
  }

  // Open requests for a set of skills, with no distance filter. Agents use this to browse.
  async getOpenRequestsForSkills(skillIds: string[]): Promise<any[]> {
    if (skillIds.length === 0) return [];
    return this.requestRepo.findOpenNearbyRequestsForSkills(skillIds);
  }

  // Same as acceptRequest, but an agent fills the slot with one of their roster workers.
  // The worker is given explicitly (the roster worker has no login), and the booking is
  // stamped with the agent's id so the agent can later operate it and earn commission.
  async assignWorkerToItem(agentId: string, itemId: string, workerId: string, workerUserId: string): Promise<any> {
    const lockKey = `lock:instant-item:${itemId}`;
    const lockToken = await this.cache.acquireLock(lockKey, 15);

    if (!lockToken) {
      throw new BusinessException("CONCURRENT_LOCK", "Someone else is already accepting this request item.");
    }

    try {
      const result = await this.prisma.transaction(async (tx) => {
        const item = await this.requestRepo.findRequestItemWithRequest(itemId, tx);

        if (!item) {
          throw new NotFoundException("InstantRequestItem", itemId);
        }

        if (item.request.bookingMode !== "DIRECT") {
          throw new BadRequestException("This request does not support direct accept");
        }

        if (item.request.status !== "OPEN") {
          throw new BusinessException("REQUEST_CLOSED", "Request is closed");
        }

        const workerSkillIds = await this.requestRepo.findWorkerSkillIds(workerId, tx);
        if (!workerSkillIds.includes(item.skillId)) {
          throw new BadRequestException("This worker doesn't have the required skill");
        }

        const alreadyAccepted = await this.requestRepo.findResponseByItemAndWorker(itemId, workerId, tx);
        if (alreadyAccepted) {
          throw new BusinessException("ALREADY_ACCEPTED", "This worker has already been assigned to this item");
        }

        if (item.acceptedWorkers >= item.requiredWorkers) {
          throw new BusinessException("SLOTS_FILLED", "All slots are filled");
        }

        const response = await this.requestRepo.createResponse(itemId, workerId, tx);

        const { code: startOtpPlain, hash: startOtp } = await generateHashedStartOtp();

        const booking = await this.requestRepo.createBooking(
          {
            providerId: item.request.providerId,
            workerId,
            agentId,
            instantRequestId: item.request.id,
            instantRequestResponseId: response.id,
            amount: item.request.amount,
            status: BookingStatus.WORKER_ASSIGNED,
            startOtp,
          },
          tx,
        );

        await this.cache.set(bookingStartOtpCacheKey(booking.id), startOtpPlain, BOOKING_START_OTP_CACHE_TTL_SECONDS);

        // Same as in acceptRequest: write the first audit-history row by hand.
        await this.historyRepo.append(
          {
            bookingId: booking.id,
            fromStatus: BookingStatus.CREATED,
            toStatus: BookingStatus.WORKER_ASSIGNED,
            changedBy: agentId,
            reason: 'Agent assigned a roster worker to this instant request item',
          },
          tx,
        );

        // Same double-booking guard as in acceptRequest.
        const workerClaimed = await this.requestRepo.markWorkerUnavailableIfAvailable(workerId, tx);
        if (workerClaimed === 0) {
          throw new BusinessException("WORKER_UNAVAILABLE", "This worker has just been booked elsewhere");
        }

        // Busy workers are removed from the GEO index so matching stops offering them jobs.
        for (const skillId of workerSkillIds) {
          await this.cache.geoRemove(`geo:instant-workers:${skillId}`, workerId);
        }

        // Take a slot, then close the item / request if that was the last one (see acceptRequest).
        const updateCount = await this.requestRepo.incrementAcceptedWorkersIfSlotAvailable(
          itemId,
          item.requiredWorkers,
          tx,
        );

        if (updateCount === 0) {
          throw new BusinessException("SLOTS_FILLED", "All slots are already filled");
        }

        const updatedItem = await this.requestRepo.findItemById(itemId, tx);
        if (!updatedItem) {
          throw new NotFoundException("InstantRequestItem", itemId);
        }

        if (updatedItem.acceptedWorkers >= updatedItem.requiredWorkers) {
          await this.requestRepo.markItemFilled(itemId, tx);
        }

        const openItems = await this.requestRepo.countOpenItemsForRequest(item.requestId, tx);
        if (openItems === 0) {
          await this.requestRepo.markRequestFilled(item.requestId, tx);
        }

        const finalItem = await this.requestRepo.findItemById(itemId, tx);

        return {
          item: finalItem,
          providerUserId: item.request.providerId,
          bookingId: booking.id,
          booking,
        };
      });

      await CacheInvalidationService.afterInstantRequestAccepted(result.providerUserId, workerUserId);
      await this.eventPublisher.publish(RoutingKeys.BOOKING_CREATED, result.booking);

      try {
        const io = getIO();
        io.to(`user:${result.providerUserId}`).emit("bookingUpdated", {
          id: result.bookingId,
          status: "accepted",
          workerId,
          requestId: result.item?.requestId,
          itemId,
        });
      } catch (err) {
        this.logger.debug("Skipped accept socket emit — socket not initialized", { itemId });
      }

      return {
        ...result.item,
        bookingId: result.bookingId,
      };
    } finally {
      await this.cache.releaseLock(lockKey, lockToken);
    }
  }

  // The provider's own requests (their history / currently open ones).
  async getMyRequests(userId: string) {
    const provider = await this.requestRepo.findProviderProfileByUserId(userId);
    if (!provider) {
      throw new NotFoundException("ProviderProfile", userId);
    }

    const requests = await this.requestRepo.findRequestsByProvider(userId);
    return requests;
  }

  // Bidding mode: a worker offers a price for a request. Re-bidding replaces their earlier bid.
  async submitBid(userId: string, requestId: string, bidAmount: number) {
    const worker = await this.requestRepo.findWorkerWithSkillsAndUser(userId);

    if (!worker) {
      throw new NotFoundException("WorkerProfile", userId);
    }
    if (!worker.isAvailable || !worker.user.isActive) {
      throw new BusinessException("WORKER_UNAVAILABLE", "Worker is not available to place bids");
    }

    const request = await this.requestRepo.findRequestById(requestId);

    if (!request) {
      throw new NotFoundException("InstantRequest", requestId);
    }
    if (request.bookingMode !== "BIDDING") {
      throw new BadRequestException("This request does not support bidding");
    }
    if (request.status !== "OPEN") {
      throw new BusinessException("REQUEST_CLOSED", "Bidding for this request is closed");
    }
    if (request.expiresAt < new Date()) {
      throw new BusinessException("REQUEST_EXPIRED", "Bidding for this request has expired");
    }

    // A bid may undercut the provider's price by at most 20%, and can't go above it.
    const requestAmount = Number(request.amount);
    const minBid = 0.8 * requestAmount;
    const maxBid = requestAmount;
    if (bidAmount < minBid || bidAmount > maxBid) {
      throw new BadRequestException(`Bid amount must be between ₹${Math.round(minBid)} and ₹${maxBid}`);
    }

    const bid = await this.prisma.transaction(async (tx) => {
      return this.requestRepo.upsertBid(requestId, worker.id, bidAmount, tx);
    });

    // Show the new bid on the provider's screen right away. Best effort - the bid is saved either way.
    try {
      const io = getIO();
      io.to(`user:${request.providerId}`).emit("instant-bidding:bid-submitted", {
        bidId: bid.id,
        instantRequestId: bid.instantRequestId,
        bidAmount: bid.bidAmount,
        workerName: bid.worker.user.name,
        rating: bid.worker.rating,
        experience: bid.worker.experience,
        totalJobs: bid.worker.totalJobs,
      });
    } catch (err) {
      this.logger.debug("Skipped bid-submitted socket emit — socket not initialized", { requestId });
    }

    return bid;
  }

  // Provider picks the winning bid: a booking is created at the bid price, the other bids are
  // rejected and the request is closed. A lock stops two selections running at once.
  async selectBid(userId: string, requestId: string, bidId: string) {
    const lockKey = `lock:instant-bid-select:${requestId}`;
    const lockToken = await this.cache.acquireLock(lockKey, 15);
    if (!lockToken) {
      throw new BusinessException("CONCURRENT_SELECTION", "Another transaction is processing this request selection.");
    }

    try {
      const result = await this.prisma.transaction(async (tx) => {
        const request = await this.requestRepo.findRequestById(requestId, tx);

        if (!request) {
          throw new NotFoundException("InstantRequest", requestId);
        }
        if (request.providerId !== userId) {
          throw new ForbiddenException("You are not authorized to manage this request");
        }
        if (request.status !== "OPEN") {
          throw new BusinessException("REQUEST_CLOSED", "This request is no longer open for selection");
        }

        const bid = await this.requestRepo.findBidById(bidId, tx);

        if (!bid || bid.instantRequestId !== requestId) {
          throw new NotFoundException("InstantRequestBid", bidId);
        }
        if (bid.status !== "ACTIVE") {
          throw new BusinessException("BID_INACTIVE", "This bid is no longer active");
        }

        // The worker may have gone offline or taken another job since they bid - check again.
        if (!bid.worker.isAvailable || !bid.worker.user.isActive) {
          throw new BusinessException("WORKER_UNAVAILABLE", "This worker is no longer available");
        }

        const { code: startOtpPlain, hash: startOtp } = await generateHashedStartOtp();

        // Create booking with selected bid amount
        const booking = await this.requestRepo.createBooking(
          {
            providerId: request.providerId,
            workerId: bid.workerId,
            instantRequestId: request.id,
            amount: bid.bidAmount,
            status: BookingStatus.WORKER_ASSIGNED,
            startOtp,
          },
          tx,
        );

        await this.cache.set(bookingStartOtpCacheKey(booking.id), startOtpPlain, BOOKING_START_OTP_CACHE_TTL_SECONDS);

        // Same as in acceptRequest: write the first audit-history row by hand.
        await this.historyRepo.append(
          {
            bookingId: booking.id,
            fromStatus: BookingStatus.CREATED,
            toStatus: BookingStatus.WORKER_ASSIGNED,
            changedBy: userId,
            reason: 'Provider selected worker bid',
          },
          tx,
        );

        // Winner marked selected, everyone else rejected, request closed.
        await this.requestRepo.markBidSelected(bidId, tx);
        await this.requestRepo.rejectOtherBids(requestId, bidId, tx);
        await this.requestRepo.markRequestFilled(requestId, tx);

        // Mark the worker busy if they're still free. If someone else got them first this
        // throws, and the whole transaction (including the booking above) is rolled back.
        const workerClaimed = await this.requestRepo.markWorkerUnavailableIfAvailable(bid.workerId, tx);
        if (workerClaimed === 0) {
          throw new BusinessException("WORKER_UNAVAILABLE", "This worker has just been booked on another job");
        }

        // Remove them from the GEO index too.
        const skillIds = await this.requestRepo.findWorkerSkillIds(bid.workerId, tx);
        for (const skillId of skillIds) {
          await this.cache.geoRemove(`geo:instant-workers:${skillId}`, bid.workerId);
        }

        return {
          bookingId: booking.id,
          providerUserId: request.providerId,
          workerUserId: bid.worker.userId,
          booking,
        };
      });

      // Queue the durable notifications (email/SMS/push), same as in acceptRequest.
      await this.eventPublisher.publish(RoutingKeys.BOOKING_CREATED, result.booking);

      // Live websocket update; best effort, the booking is already committed.
      try {
        const io = getIO();
        io.to(`user:${result.providerUserId}`).emit("instant-bidding:closed");
        io.to(`user:${result.workerUserId}`).emit("instant-request:matched");
      } catch (err) {
        this.logger.debug("Skipped select-bid socket emit — socket not initialized", { requestId, bidId });
      }

      return result;
    } finally {
      await this.cache.releaseLock(lockKey, lockToken);
    }
  }

  // Provider cancels their own request while it is still open.
  async cancelRequest(userId: string, requestId: string): Promise<void> {
    const request = await this.requestRepo.findRequestById(requestId);

    if (!request) {
      throw new NotFoundException("InstantRequest", requestId);
    }
    if (request.providerId !== userId) {
      throw new ForbiddenException("You are not authorized to cancel this request");
    }

    // Only cancels if it's still OPEN. If a worker accepted at the very same moment, nothing
    // is changed and the provider gets an error instead of wiping out a fresh booking.
    const cancelled = await this.requestRepo.updateStatusIfOpen(requestId, "CANCELLED");
    if (cancelled === 0) {
      throw new BusinessException("REQUEST_ALREADY_RESOLVED", "This request has already been accepted or is no longer open");
    }

    // Nothing else to do here: the matching loop for this request checks the status on its
    // next poll and tells the workers it already notified that the request is gone.
  }
}
