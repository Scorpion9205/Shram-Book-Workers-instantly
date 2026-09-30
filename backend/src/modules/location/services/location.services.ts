import type { UpdateLocationInput } from "../validations/location.validation.js";
import type { ICacheService } from "../../../core/interfaces/ICacheService.js";
import type { ILocationRepository } from "../interfaces/ILocationRepository.js";
import type { ILocationService } from "../interfaces/ILocationService.js";
import { NotFoundException } from "../../../core/exceptions/index.js";

export class LocationService implements ILocationService {
  constructor(
    private readonly locationRepo: ILocationRepository,
    private readonly cache: ICacheService,
  ) {}

  async updateLocation(userId: string, data: UpdateLocationInput) {
    const worker = await this.locationRepo.findWorkerWithSkillsAndUser(userId);

    if (!worker) {
      throw new NotFoundException("WorkerProfile", userId);
    }

    await this.locationRepo.updateWorkerCoordinates(worker.id, data.latitude, data.longitude);

    // Sync to Redis GEO only if the worker is both available AND not suspended/deactivated.
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
