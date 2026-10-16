import type { UpdateLocationInput } from "../validations/location.validation.js";
import type { ICacheService } from "../../../core/interfaces/ICacheService.js";
import type { ILocationRepository } from "../interfaces/ILocationRepository.js";
import type { ILocationService } from "../interfaces/ILocationService.js";
import { NotFoundException } from "../../../core/exceptions/index.js";

/**
 * Keeps a worker's last known position in two places: the database (source of truth for
 * profile/distance queries) and a Redis GEO index (what instant-request matching searches).
 */
export class LocationService implements ILocationService {
  constructor(
    private readonly locationRepo: ILocationRepository,
    private readonly cache: ICacheService,
  ) {}

  // Called whenever a worker's app (or their agent) reports a new position.
  async updateLocation(userId: string, data: UpdateLocationInput) {
    const worker = await this.locationRepo.findWorkerWithSkillsAndUser(userId);

    if (!worker) {
      throw new NotFoundException("WorkerProfile", userId);
    }

    await this.locationRepo.updateWorkerCoordinates(worker.id, data.latitude, data.longitude);

    // Sync to Redis GEO only if the worker is both available AND not suspended/deactivated.
    // One GEO set per skill: instant matching searches "plumbers near X", so a worker with
    // three skills has to appear in three sets.
    if (worker.isAvailable && worker.user.isActive) {
      for (const skill of worker.skills) {
        await this.cache.geoAdd(`geo:instant-workers:${skill.skillId}`, {
          lat: data.latitude,
          lng: data.longitude,
          member: worker.id,
        });
      }
    }

    return {
      userId,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  }

  // Returns the saved position, or a 404 if the worker has never shared one.
  async getMyLocation(userId: string) {
    const location = await this.locationRepo.findWorkerLocation(userId);

    if (!location || location.latitude === null || location.longitude === null) {
      throw new NotFoundException("Location not found for worker");
    }

    return {
      userId,
      latitude: location.latitude,
      longitude: location.longitude,
    };
  }
}
