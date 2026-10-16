import { PrismaService } from "../../../database/prisma/PrismaService.js";
import type { ILocationRepository, WorkerWithSkillsAndUser } from "../interfaces/ILocationRepository.js";

// Prisma queries for worker coordinates. No business rules here - see LocationService.
export class LocationRepository implements ILocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Skills are needed to know which Redis GEO sets to update; user.isActive tells us if the
  // account has been suspended (suspended workers must not be matched).
  async findWorkerWithSkillsAndUser(userId: string): Promise<WorkerWithSkillsAndUser | null> {
    return this.prisma.client.workerProfile.findUnique({
      where: { userId },
      include: { skills: true, user: { select: { isActive: true } } },
    });
  }

  async updateWorkerCoordinates(workerId: string, latitude: number, longitude: number): Promise<void> {
    await this.prisma.client.workerProfile.update({
      where: { id: workerId },
      data: { latitude, longitude },
    });
  }

  async findWorkerLocation(userId: string): Promise<{ latitude: number | null; longitude: number | null } | null> {
    const worker = await this.prisma.client.workerProfile.findUnique({
      where: { userId },
      select: { latitude: true, longitude: true },
    });
    if (!worker) return null;
    // Coordinates are stored as Decimal-ish values; hand back plain numbers (or null if unset).
    return {
      latitude: worker.latitude === null ? null : Number(worker.latitude),
      longitude: worker.longitude === null ? null : Number(worker.longitude),
    };
  }
}
