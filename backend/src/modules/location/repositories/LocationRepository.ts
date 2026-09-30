import { PrismaService } from "../../../database/prisma/PrismaService.js";
import type { ILocationRepository, WorkerWithSkillsAndUser } from "../interfaces/ILocationRepository.js";

export class LocationRepository implements ILocationRepository {
  constructor(private readonly prisma: PrismaService) {}

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
    return {
      latitude: worker.latitude === null ? null : Number(worker.latitude),
      longitude: worker.longitude === null ? null : Number(worker.longitude),
    };
  }
}
