import prisma from "../../../shared/config/prisma.js";
import { RedisService } from "../../../shared/services/redis/redis.service.js";
import { getIO } from "../../../socket/socket.js";

export class InstantMatchingService {
  static async startMatching(requestId: string) {
    const stages = [2, 5, 15, 30];
    const notifiedWorkerIds = new Set<string>();

    for (const radius of stages) {
      const request = await prisma.instantRequest.findUnique({
        where: { id: requestId },
        include: { skill: true, items: true, provider: true }
      });

      if (!request || request.status === "FILLED" || request.status === "CANCELLED" || request.status === "EXPIRED") {
        break;
      }

      const skillId = request.skillId;
      if (!skillId) break;

      const workerIds = await RedisService.geoSearch(
        `geo:instant-workers:${skillId}`,
        request.longitude,
        request.latitude,
        radius
      );

      const eligibleWorkers = await prisma.workerProfile.findMany({
        where: {
          id: { in: workerIds },
          isAvailable: true,
          user: { role: "WORKER" },
          skills: {
            some: {
              skillId: skillId
            }
          }
        },
        include: { user: { include: { location: true } } }
      });

      const newWorkers = eligibleWorkers.filter(w => !notifiedWorkerIds.has(w.id));

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
            }
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

      await new Promise(resolve => setTimeout(resolve, 15000));
    }

    const finalRequest = await prisma.instantRequest.findUnique({
      where: { id: requestId }
    });
    if (finalRequest && finalRequest.status === "OPEN") {
      await prisma.instantRequest.update({
        where: { id: requestId },
        data: { status: "EXPIRED" }
      });

      const io = getIO();
      if (finalRequest.bookingMode === "DIRECT") {
        io.to(`user:${finalRequest.providerId}`).emit("instant-request:no-worker");
      } else {
        io.to(`user:${finalRequest.providerId}`).emit("instant-bidding:no-bids");
      }
    }
  }
}
