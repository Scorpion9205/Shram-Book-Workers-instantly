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

// NOTE: this is a behavior-preserving conversion from the previous static-method,
// raw-Prisma implementation into an OOP+DI class — see shram_audit.md / the final
// implementation plan for the bugs found in this file (BOOK-02, BOOK-04, BOOK-05) that are
// deliberately NOT fixed here. They land as separate follow-up PRs now that this class is
// unit-testable. The one exception is the hardcoded `rating: 4.8` / `totalJobs: 12` mock
// data in submitBid(), which is fixed here since it was explicitly scoped as part of this
// same conversion.
export class InstantRequestService implements IInstantRequestService {
  private readonly logger = new Logger('InstantRequestService');

  constructor(
    private readonly requestRepo: IInstantRequestRepository,
    private readonly cache: ICacheService,
    private readonly prisma: PrismaService,
    private readonly matchingService: IInstantMatchingService,
    private readonly historyRepo: IBookingHistoryRepository,
  ) {}

  async createInstantRequest(userId: string, data: CreateInstantRequestInput) {
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
          amount: amount ?? fare.total,
          bookingMode,
          skillId: items[0]?.skillId || null,
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

    // Start asynchronous radius expansion matching
    this.matchingService.startMatching(createdRequest.id).catch((err) => {
      this.logger.error('Async matching orchestrator error', err);
    });

    return createdRequest;
  }

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

  async acceptRequest(userId: string, itemId: string) {
    const worker = await this.requestRepo.findWorkerWithSkills(userId);

    if (!worker) {
      throw new NotFoundException("WorkerProfile", userId);
    }
    if (!worker.isAvailable) {
      throw new BusinessException("WORKER_UNAVAILABLE", "Worker is not available for bookings");
    }

    const lockKey = `lock:instant-item:${itemId}`;
    const lockToken = await this.cache.acquireLock(lockKey, 15);

    if (!lockToken) {
      throw new BusinessException("CONCURRENT_LOCK", "Another worker is already accepting this request.");
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

        const response = await this.requestRepo.createResponse(itemId, worker.id, tx);

        const { code: startOtpPlain, hash: startOtp } = await generateHashedStartOtp();

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

        await this.cache.set(bookingStartOtpCacheKey(booking.id), startOtpPlain, BOOKING_START_OTP_CACHE_TTL_SECONDS);

        // Booking creation above writes the row directly, bypassing BookingStateService — so
        // without this, the booking would have zero audit history until (if ever) its next
        // transition. BookingStateService.transition() itself can't be used here: it requires
        // an existing booking to read a current status from, and CREATED -> WORKER_ASSIGNED
        // isn't even a valid edge in VALID_TRANSITIONS (only PAYMENT_CONFIRMED -> WORKER_ASSIGNED
        // is) — instant-request bookings skip the payment leg entirely. CREATED is recorded as
        // the conventional "genesis" fromStatus, matching the schema's own default status.
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

        // Atomically mark the worker unavailable — only if they're still available. This is
        // what actually prevents the same worker from being double-booked by two concurrent
        // accepts on different items/requests; the Redis lock above only guards this one item.
        const workerClaimed = await this.requestRepo.markWorkerUnavailableIfAvailable(worker.id, tx);
        if (workerClaimed === 0) {
          throw new BusinessException("WORKER_UNAVAILABLE", "You have just been booked on another job");
        }

        // Remove from Redis GEO list
        for (const s of worker.skills) {
          await this.cache.geoRemove(`geo:instant-workers:${s.skillId}`, worker.id);
        }

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
          workerUserId: worker.userId,
          bookingId: booking.id,
        };
      });

      await CacheInvalidationService.afterInstantRequestAccepted(result.providerUserId, result.workerUserId);

      const io = getIO();

      io.to(`user:${result.providerUserId}`).emit("bookingUpdated", {
        id: result.bookingId,
        status: "accepted",
        workerId: worker.id,
        requestId: result.item?.requestId,
        itemId,
      });

      // Notify worker of confirmation
      io.to(`user:${result.workerUserId}`).emit("instant-request:matched");

      return {
        ...result.item,
        bookingId: result.bookingId,
      };
    } finally {
      await this.cache.releaseLock(lockKey, lockToken);
    }
  }

  async getMyRequests(userId: string) {
    const provider = await this.requestRepo.findProviderProfileByUserId(userId);
    if (!provider) {
      throw new NotFoundException("ProviderProfile", userId);
    }

    const requests = await this.requestRepo.findRequestsByProvider(userId);
    return requests;
  }

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

    // Enforce 20% max discount rule
    const requestAmount = Number(request.amount);
    const minBid = 0.8 * requestAmount;
    const maxBid = requestAmount;
    if (bidAmount < minBid || bidAmount > maxBid) {
      throw new BadRequestException(`Bid amount must be between ₹${Math.round(minBid)} and ₹${maxBid}`);
    }

    const bid = await this.prisma.transaction(async (tx) => {
      return this.requestRepo.upsertBid(requestId, worker.id, bidAmount, tx);
    });

    // Notify provider of the live bid via Socket.IO
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

    return bid;
  }

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

        // Recheck worker availability
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

        // See the identical comment in acceptRequest() — booking creation bypasses
        // BookingStateService, so this writes the missing genesis audit-history row directly.
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

        // Set statuses
        await this.requestRepo.markBidSelected(bidId, tx);
        await this.requestRepo.rejectOtherBids(requestId, bidId, tx);
        await this.requestRepo.markRequestFilled(requestId, tx);

        // Atomically mark the worker unavailable — only if still available. If a concurrent
        // acceptRequest()/selectBid() already claimed this worker first, this rolls back the
        // whole transaction (including the booking just created above) instead of silently
        // double-booking them.
        const workerClaimed = await this.requestRepo.markWorkerUnavailableIfAvailable(bid.workerId, tx);
        if (workerClaimed === 0) {
          throw new BusinessException("WORKER_UNAVAILABLE", "This worker has just been booked on another job");
        }

        // Sync Redis availability removal
        const skillIds = await this.requestRepo.findWorkerSkillIds(bid.workerId, tx);
        for (const skillId of skillIds) {
          await this.cache.geoRemove(`geo:instant-workers:${skillId}`, bid.workerId);
        }

        return {
          bookingId: booking.id,
          providerUserId: request.providerId,
          workerUserId: bid.worker.userId,
        };
      });

      // Socket notifies
      const io = getIO();
      io.to(`user:${result.providerUserId}`).emit("instant-bidding:closed");
      io.to(`user:${result.workerUserId}`).emit("instant-request:matched");

      return result;
    } finally {
      await this.cache.releaseLock(lockKey, lockToken);
    }
  }

  async cancelRequest(userId: string, requestId: string): Promise<void> {
    const request = await this.requestRepo.findRequestById(requestId);

    if (!request) {
      throw new NotFoundException("InstantRequest", requestId);
    }
    if (request.providerId !== userId) {
      throw new ForbiddenException("You are not authorized to cancel this request");
    }

    // Conditional on still being OPEN — if a worker accepted in the same instant the
    // Provider clicked Cancel, this is a no-op rather than clobbering a just-created booking.
    const cancelled = await this.requestRepo.updateStatusIfOpen(requestId, "CANCELLED");
    if (cancelled === 0) {
      throw new BusinessException("REQUEST_ALREADY_RESOLVED", "This request has already been accepted or is no longer open");
    }

    // The running InstantMatchingService.startMatching() loop for this request will notice
    // the status change on its next poll and notify already-broadcast workers itself.
  }
}
