import { getIO } from "../../../socket/socket.js";
import type { ICacheService } from "../../../core/interfaces/ICacheService.js";
import type { IPlatformSettingRepository } from "../../platform-settings/interfaces/IPlatformSettingRepository.js";
import type { IMapsProvider } from "../../pricing/interfaces/IPricingStrategy.js";
import type { IInstantRequestRepository } from "../interfaces/IInstantRequestRepository.js";
import type { IInstantMatchingService } from "../interfaces/IInstantMatchingService.js";
import { CacheKeys } from "../../../infrastructure/cache/cacheKeys.js";
import { Logger } from "../../../core/logger/Logger.js";

// Search radii in km, tried from smallest to largest. Admins can change this in platform
// settings; this is the fallback when nothing is configured.
const DEFAULT_RADIUS_TIERS_KM = [2, 5, 10];
const PLATFORM_SETTING_KEY = "instantRequestRadiusTiers";
const TIERS_CACHE_TTL_SECONDS = 60;
// Once every radius has been tried (or workers were already found), wait this long before
// looking again for newly available workers or a cancellation. It's a polling pause, not a
// timeout - the loop never gives up by itself.
const REPOLL_INTERVAL_MS = 10_000;
// Statuses after which a request is finished and the loop should stop.
const TERMINAL_STATUSES = new Set(["FILLED", "CANCELLED", "EXPIRED", "COMPLETED"]);

/**
 * Finds workers for an instant request and notifies them over websockets.
 *
 * It starts with a small search radius and widens it (2km -> 5km -> 10km by default) while
 * nobody is found. There is deliberately no timeout: the request stays open and keeps
 * looking until a worker accepts or the provider cancels. So the loop below only ends when
 * the request's status changes through some other code path.
 */
export class InstantMatchingService implements IInstantMatchingService {
  private readonly logger = new Logger('InstantMatchingService');

  constructor(
    private readonly requestRepo: IInstantRequestRepository,
    private readonly cache: ICacheService,
    private readonly platformSettingRepo: IPlatformSettingRepository,
    private readonly mapsProvider: IMapsProvider,
  ) {}

  // Radius steps from platform settings (cached for a minute), or the defaults if unset/invalid.
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

  // Called once at server startup. The matching loops live in memory, so a restart/deploy
  // kills them; this restarts one for every request that is still OPEN.
  async resumeAllOpenRequests(): Promise<void> {
    const openRequestIds = await this.requestRepo.findAllOpenRequestIds();
    if (openRequestIds.length > 0) {
      this.logger.info(`Resuming matching for ${openRequestIds.length} still-open instant request(s) after startup`);
    }
    for (const requestId of openRequestIds) {
      this.startMatching(requestId).catch((err) => {
        this.logger.error(`Failed to resume matching for request ${requestId}`, err);
      });
    }
  }

  // The matching loop for one request. Each round: re-read the request, search for workers
  // at the current radius, notify the new ones, then widen the radius or wait and repeat.
  async startMatching(requestId: string): Promise<void> {
    const tiers = await this.getRadiusTiers();
    // Workers already notified, so nobody gets the same request twice.
    const notifiedWorkerIds = new Set<string>();
    let tierIndex = 0;

    while (true) {
      const request = await this.requestRepo.findRequestWithItemsAndProvider(requestId);

      if (!request) {
        return;
      }

      if (TERMINAL_STATUSES.has(request.status)) {
        // The request ended (filled by a worker, or cancelled by the provider). Tell everyone
        // we had notified, otherwise their app keeps showing a request that no longer exists.
        if ((request.status === "FILLED" || request.status === "CANCELLED") && notifiedWorkerIds.size > 0) {
          const io = getIO();
          // Websocket rooms are named after the *user* id, not the worker-profile id.
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

      // Ask Redis "which available workers with this skill are within `radius` km of the job?"
      const radius = tiers[Math.min(tierIndex, tiers.length - 1)] ?? DEFAULT_RADIUS_TIERS_KM[DEFAULT_RADIUS_TIERS_KM.length - 1]!;
      const workerIds = await this.cache.geoSearch(
        `geo:instant-workers:${skillId}`,
        request.latitude,
        request.longitude,
        radius,
        'km',
      );

      // Redis only gives ids; double-check against the DB (still available, account active, ...).
      const eligibleWorkers = await this.requestRepo.findEligibleWorkersForMatching(workerIds, skillId);
      const newWorkers = eligibleWorkers.filter((w) => !notifiedWorkerIds.has(w.userId));

      for (const worker of newWorkers) {
        notifiedWorkerIds.add(worker.userId);

        const io = getIO();

        // Road distance and ETA from the worker to the job, shown on the worker's popup.
        // getRoute() falls back to a straight-line estimate if Mapbox is down, so it won't throw.
        let distanceKm = 0;
        let estimatedMinutes = 0;
        if (worker.latitude != null && worker.longitude != null) {
          const route = await this.mapsProvider.getRoute(
            { lat: Number(worker.latitude), lng: Number(worker.longitude) },
            { lat: request.latitude, lng: request.longitude },
          );
          distanceKm = Number(route.distanceKm.toFixed(2));
          estimatedMinutes = Math.round(route.durationMinutes);
        }

        // DIRECT requests get an "accept" popup; BIDDING requests get a "place your bid" card.
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
              distanceKm,
              estimatedMinutes,
            },
          });
        } else {
          io.to(`user:${worker.userId}`).emit("instant-bidding:new", {
            requestId: request.id,
            title: request.title,
            providerName: request.provider?.name || "A nearby Provider",
            workerType: request.skill?.name || "Task",
            address: request.address,
            notes: request.description,
            amount: request.amount,
            expiresAt: request.expiresAt,
            distanceKm,
            estimatedMinutes,
          });
        }
      }

      // Nobody at this radius and a wider one exists: widen right away, no waiting.
      if (eligibleWorkers.length === 0 && tierIndex < tiers.length - 1) {
        tierIndex++;
        continue;
      }

      // Either workers were found, or we're already at the widest radius. Pause briefly, then
      // check again for workers who just came online or for a cancellation.
      await new Promise((resolve) => setTimeout(resolve, REPOLL_INTERVAL_MS));
    }
  }
}
