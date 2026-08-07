import prisma from "../../../shared/config/prisma.js";
import { RedisService } from "../../../shared/services/redis/redis.service.js";
export class LocationService {
    static async updateLocation(userId, data) {
        const existingLocation = await prisma.userLocation.findUnique({
            where: {
                userId,
            },
        });
        let loc;
        if (!existingLocation) {
            loc = await prisma.userLocation.create({
                data: {
                    userId,
                    latitude: data.latitude,
                    longitude: data.longitude,
                },
            });
        }
        else {
            loc = await prisma.userLocation.update({
                where: {
                    userId,
                },
                data: {
                    latitude: data.latitude,
                    longitude: data.longitude,
                },
            });
        }
        // Sync to Redis GEO if user is an online active worker
        const worker = await prisma.workerProfile.findUnique({
            where: { userId },
            include: { skills: true }
        });
        if (worker && worker.isAvailable) {
            for (const skill of worker.skills) {
                await RedisService.geoAdd(`geo:instant-workers:${skill.skillId}`, data.longitude, data.latitude, worker.id);
            }
        }
        return loc;
    }
    static async getMyLocation(userId) {
        const location = await prisma.userLocation.findUnique({
            where: {
                userId,
            },
        });
        if (!location) {
            throw new Error("Location not found");
        }
        return location;
    }
}
//# sourceMappingURL=location.services.js.map