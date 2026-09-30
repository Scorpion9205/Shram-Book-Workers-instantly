import { getIO } from "../../../socket/socket.js";
import type { ICacheService } from "../../../core/interfaces/ICacheService.js";
import type { IInstantRequestRepository } from "../interfaces/IInstantRequestRepository.js";
import type { IInstantMatchingService } from "../interfaces/IInstantMatchingService.js";
import { Logger } from "../../../core/logger/Logger.js";

// NOTE: this is a straight lift-and-shift of the previous static implementation into an
// OOP+DI class — the radius tiers being hardcoded (not read from PlatformSetting), the
// unconditional 15s wait per stage, and the force-EXPIRED fallback all reproduce the
// PRE-EXISTING behavior on purpose. Those are tracked as a separate, deliberate follow-up
// fix (RADIUS-01) so this refactor stays a pure behavior-preserving change.
export class InstantMatchingService implements IInstantMatchingService {
  private readonly logger = new Logger('InstantMatchingService');

  constructor(
    private readonly requestRepo: IInstantRequestRepository,
    private readonly cache: ICacheService,
  ) {}

  async startMatching(requestId: string): Promise<void> {
    const stages = [2, 5, 15, 30];
    const notifiedWorkerIds = new Set<string>();

    for (const radius of stages) {
      const request = await this.requestRepo.findRequestWithItemsAndProvider(requestId);

      if (!request || request.status === "FILLED" || request.status === "CANCELLED" || request.status === "EXPIRED") {
        break;
      }

      const skillId = request.skillId;
      if (!skillId) break;

      const workerIds = await this.cache.geoSearch(
        `geo:instant-workers:${skillId}`,
        request.latitude,
        request.longitude,
        radius,
        'km',
      );

      const eligibleWorkers = await this.requestRepo.findEligibleWorkersForMatching(workerIds, skillId);

      const newWorkers = eligibleWorkers.filter((w) => !notifiedWorkerIds.has(w.id));

      for (const worker of newWorkers) {
        notifiedWorkerIds.add(worker.id);

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

      await new Promise((resolve) => setTimeout(resolve, 15000));
    }

    const finalRequest = await this.requestRepo.findRequestById(requestId);
    if (finalRequest && finalRequest.status === "OPEN") {
      await this.requestRepo.markExpired([requestId]);

      const io = getIO();
      if (finalRequest.bookingMode === "DIRECT") {
        io.to(`user:${finalRequest.providerId}`).emit("instant-request:no-worker");
      } else {
        io.to(`user:${finalRequest.providerId}`).emit("instant-bidding:no-bids");
      }
    }
  }
}
