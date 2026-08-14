import prisma from "../../../shared/config/prisma.js";
import type { UpdateLocationInput } from "../validations/location.validation.js";
import { RedisService } from "../../../shared/services/redis/redis.service.js";

export class LocationService {
  static async updateLocation(
    userId: string,
    data: UpdateLocationInput
  ) {
    const worker = await prisma.workerProfile.findUnique({
      where: { userId },
      include: { skills: true }
    });

    if (!worker) {
      throw new Error("Worker profile not found");
    }

    const updatedWorker = await prisma.workerProfile.update({
      where: { id: worker.id },
      data: {
        latitude: data.latitude,
        longitude: data.longitude,
      },
    });

    // Sync to Redis GEO if user is an online active worker
    if (worker.isAvailable) {
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
      throw new Error(
        "Location not found"
      );
    }

    return {
      userId,
      latitude: Number(worker.latitude),
      longitude: Number(worker.longitude),
    };
  }
}