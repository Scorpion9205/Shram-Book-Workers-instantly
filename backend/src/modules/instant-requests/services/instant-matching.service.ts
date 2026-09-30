import { getIO } from "../../../socket/socket.js";
import type { ICacheService } from "../../../core/interfaces/ICacheService.js";
import type { IPlatformSettingRepository } from "../../platform-settings/interfaces/IPlatformSettingRepository.js";
import type { IInstantRequestRepository } from "../interfaces/IInstantRequestRepository.js";
import type { IInstantMatchingService } from "../interfaces/IInstantMatchingService.js";
import { CacheKeys } from "../../../infrastructure/cache/cacheKeys.js";
import { Logger } from "../../../core/logger/Logger.js";

const DEFAULT_RADIUS_TIERS_KM = [2, 5, 10];
const PLATFORM_SETTING_KEY = "instantRequestRadiusTiers";
const TIERS_CACHE_TTL_SECONDS = 60;
// How often to re-poll once every tier has been scanned at least once (or a tier already
// found workers) — this is a "check again soon" cadence for join-in-progress workers and
// cancellation detection, NOT a timeout: the loop never gives up on its own.
const REPOLL_INTERVAL_MS = 10_000;
const TERMINAL_STATUSES = new Set(["FILLED", "CANCELLED", "EXPIRED", "COMPLETED"]);

/**
 * Per the architecture plan (§7/§14): no system-driven timeout — the request stays open,
 * broadcasting to an expanding radius, until a worker accepts or the Provider explicitly
 * cancels it (see InstantRequestService.cancelRequest). This loop therefore does not return
 * on its own; it only stops when the request's status leaves OPEN via some other code path.
 */
export class InstantMatchingService implements IInstantMatchingService {
  private readonly logger = new Logger('InstantMatchingService');

  constructor(
    private readonly requestRepo: IInstantRequestRepository,
    private readonly cache: ICacheService,
    private readonly platformSettingRepo: IPlatformSettingRepository,
  ) {}

  private async getRadiusTiers(): Promise<number[]> {
    const cacheKey = CacheKeys.platformSetting(PLATFORM_SETTING_KEY);
    const cached = await this.cache.get<number[]>(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }

    const setting = await this.platformSettingRepo.get(PLATFORM_SETTING_KEY);
    const tiers = Array.isArray(setting?.value) && setting.value.length > 0
      ? (setting.value as number[])
      : DEFAULT_RADIUS_TIERS_KM;

    await this.cache.set(cacheKey, tiers, TIERS_CACHE_TTL_SECONDS);
    return tiers;
  }

  async startMatching(requestId: string): Promise<void> {
    const tiers = await this.getRadiusTiers();
    const notifiedWorkerIds = new Set<string>();
    let tierIndex = 0;

    while (true) {
      const request = await this.requestRepo.findRequestWithItemsAndProvider(requestId);

      if (!request) {
        return;
      }

      if (TERMINAL_STATUSES.has(request.status)) {
        // Someone else ended this request — either a worker accepted it (FILLED) or the
        // Provider cancelled it. Either way, every other worker who'd already been notified
        // needs to be told it's closed, or their client would keep showing a stale request.
        if ((request.status === "FILLED" || request.status === "CANCELLED") && notifiedWorkerIds.size > 0) {
          const io = getIO();
          // Same room convention used to notify workers below: `user:${userId}`, not the
          // WorkerProfile id — these two ids are different, and getting this wrong means the
          // "closed" event silently reaches an empty room instead of the actual worker clients.
          for (const workerUserId of notifiedWorkerIds) {
            io.to(`user:${workerUserId}`).emit(
              request.bookingMode === "DIRECT" ? "instant_request:closed" : "instant-bidding:closed",
              { requestId },
            );
          }
        }
        return;
      }

      const skillId = request.skillId;
      if (!skillId) return;

      const radius = tiers[Math.min(tierIndex, tiers.length - 1)] ?? DEFAULT_RADIUS_TIERS_KM[DEFAULT_RADIUS_TIERS_KM.length - 1]!;
      const workerIds = await this.cache.geoSearch(
        `geo:instant-workers:${skillId}`,
        request.latitude,
        request.longitude,
        radius,
        'km',
      );

      const eligibleWorkers = await this.requestRepo.findEligibleWorkersForMatching(workerIds, skillId);
      const newWorkers = eligibleWorkers.filter((w) => !notifiedWorkerIds.has(w.userId));

      for (const worker of newWorkers) {
        notifiedWorkerIds.add(worker.userId);

        const io = getIO();
        if (request.bookingMode === "DIRECT") {
          const itemId = request.items[0]?.id || "";

          io.to(`user:${worker.userId}`).emit("newInstantRequest", {
            itemId,
            request: {
              id: request.id,
              providerId: request.providerId,
              providerName: request.provider?.name || "A nearby Provider",
              workerType: request.skill?.name || "Task",
              latitude: request.latitude,
              longitude: request.longitude,
              address: request.address,
              amount: request.amount,
              notes: request.description,
              status: request.status,
              distanceKm: 0.1,
              estimatedMinutes: 5,
            },
          });
        } else {
          io.to(`user:${worker.userId}`).emit("instant-bidding:new", {
            requestId: request.id,
            title: request.title,
            amount: request.amount,
            expiresAt: request.expiresAt,
          });
        }
      }

      // Escalate immediately (no wait) while a tier comes back empty and a wider tier is
      // still available — this is the "progressive radius expansion" the spec calls for.
      if (eligibleWorkers.length === 0 && tierIndex < tiers.length - 1) {
        tierIndex++;
        continue;
      }

      // Either we found workers, or we're already at the widest configured tier with none —
      // either way, wait a short interval and re-check for join-in-progress workers and for
      // a cancellation, rather than escalating further or giving up.
      await new Promise((resolve) => setTimeout(resolve, REPOLL_INTERVAL_MS));
    }
  }
}
