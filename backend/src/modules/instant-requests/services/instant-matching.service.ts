import { getIO } from "../../../socket/socket.js";
import type { ICacheService } from "../../../core/interfaces/ICacheService.js";
import type { IPlatformSettingRepository } from "../../platform-settings/interfaces/IPlatformSettingRepository.js";
import type { IMapsProvider } from "../../pricing/interfaces/IPricingStrategy.js";
import type { IInstantRequestRepository } from "../interfaces/IInstantRequestRepository.js";
import type { IInstantMatchingService } from "../interfaces/IInstantMatchingService.js";
import { Logger } from "../../../core/logger/Logger.js";

// How long to wait between rounds before looking again for newly available workers or a
// cancellation. It's a polling pause, not a timeout - the loop never gives up by itself.
const REPOLL_INTERVAL_MS = 10_000;
// Statuses after which a request is finished and the loop should stop.
const TERMINAL_STATUSES = new Set(["FILLED", "CANCELLED", "EXPIRED", "COMPLETED"]);

/**
 * Finds workers for an instant request and notifies them over websockets.
 *
 * For now there is NO distance filter: every available, active worker who has the requested
 * skill is notified. (Radius-based matching - search 2km, then 5km, then 10km around the job -
 * is planned for the next version.) There is deliberately no timeout: the request stays open
 * and keeps looking until a worker accepts or the provider cancels, so the loop below only
 * ends when the request's status changes through some other code path.
 */
export class InstantMatchingService implements IInstantMatchingService {
  private readonly logger = new Logger('InstantMatchingService');

  // cache and platformSettingRepo are not used while matching ignores distance; they stay in
  // the constructor so the radius search can come back without changing how this is wired up.
  constructor(
    private readonly requestRepo: IInstantRequestRepository,
    private readonly cache: ICacheService,
    private readonly platformSettingRepo: IPlatformSettingRepository,
    private readonly mapsProvider: IMapsProvider,
  ) {}

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

  // The matching loop for one request. Each round: re-read the request, find available workers
  // with the skill, notify the ones not yet told, then wait and repeat.
  async startMatching(requestId: string): Promise<void> {
    // Workers already notified, so nobody gets the same request twice.
    const notifiedWorkerIds = new Set<string>();

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

      // Every available, active worker with this skill (no distance filter for now).
      const eligibleWorkers = await this.requestRepo.findEligibleWorkersBySkill(skillId);
      const newWorkers = eligibleWorkers.filter((w) => !notifiedWorkerIds.has(w.userId));

      // One line per round so it's easy to see in the logs where matching stops finding people.
      this.logger.info(
        `Matching request ${requestId}: ${eligibleWorkers.length} eligible worker(s), ${newWorkers.length} newly notified`,
      );

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

      // Pause briefly, then check again for workers who just came online or for a cancellation.
      await new Promise((resolve) => setTimeout(resolve, REPOLL_INTERVAL_MS));
    }
  }
}
