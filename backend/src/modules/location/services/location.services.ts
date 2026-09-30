import prisma from "../../../shared/config/prisma.js";
import type { UpdateLocationInput } from "../validations/location.validation.js";
import { RedisService } from "../../../shared/services/redis/redis.service.js";
import { NotFoundException } from "../../../core/exceptions/index.js";

export class LocationService {
  static async updateLocation(
    userId: string,
    data: UpdateLocationInput
  ) {
    const worker = await prisma.workerProfile.findUnique({
      where: { userId },
      include: { skills: true, user: { select: { isActive: true } } }
    });

    if (!worker) {
      throw new NotFoundException("WorkerProfile", userId);
    }

    const updatedWorker = await prisma.workerProfile.update({
      where: { id: worker.id },
      data: {
        latitude: data.latitude,
        longitude: data.longitude,
      },
    });

    // Sync to Redis GEO only if the worker is both available AND not suspended/deactivated —
    // previously only `isAvailable` was checked, so a suspended-but-still-"available" worker
    // could get re-added to the geo index (and keep receiving instant-request broadcasts)
    // just by pinging this endpoint after an admin suspension.
    if (worker.isAvailable && worker.user.isActive) {
      for (const skill of worker.skills) {
        await RedisService.geoAdd(`geo:instant-workers:${skill.skillId}`, data.longitude, data.latitude, worker.id);
      }
    }

    return {
      userId,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  }

  static async getMyLocation(
    userId: string
  ) {
    const worker = await prisma.workerProfile.findUnique({
      where: { userId },
    });

    if (!worker || worker.latitude === null || worker.longitude === null) {
      throw new NotFoundException("Location not found for worker");
    }

    return {
      userId,
      latitude: Number(worker.latitude),
      longitude: Number(worker.longitude),
    };
  }
}