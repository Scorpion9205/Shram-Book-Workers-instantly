import { RedisService } from "../redis/redis.service.js";
export class CacheInvalidationService {
    static async afterJobCreated(providerUserId) {
        await Promise.all([
            RedisService.del(`dashboard:provider:${providerUserId}`),
            RedisService.deletePattern("jobs:nearby:*")
        ]);
    }
    static async afterJobAccepted(providerUserId, workerUserId, agentUserId) {
        const promises = [
            RedisService.del(`dashboard:provider:${providerUserId}`),
            RedisService.deletePattern("jobs:nearby:*")
        ];
        if (workerUserId) {
            promises.push(RedisService.del(`dashboard:worker:${workerUserId}`));
        }
        await Promise.all(promises);
    }
    static async afterBookingCompleted(providerUserId, workerUserId) {
        await Promise.all([
            RedisService.del(`dashboard:provider:${providerUserId}`),
            RedisService.del(`dashboard:worker:${workerUserId}`)
        ]);
    }
    static async afterReviewAdded(workerUserId) {
        await RedisService.del(`dashboard:worker:${workerUserId}`);
    }
    static async afterInstantRequestCreated(providerUserId) {
        await Promise.all([
            RedisService.del(`dashboard:provider:${providerUserId}`),
            RedisService.deletePattern("requests:nearby:*")
        ]);
    }
    static async afterInstantRequestAccepted(providerUserId, workerUserId) {
        await Promise.all([
            RedisService.del(`dashboard:provider:${providerUserId}`),
            RedisService.del(`dashboard:worker:${workerUserId}`),
            RedisService.deletePattern("requests:nearby:*")
        ]);
    }
    static async afterInstantRequestCompleted(providerUserId, workerUserId) {
        await Promise.all([
            RedisService.del(`dashboard:provider:${providerUserId}`),
            RedisService.del(`dashboard:worker:${workerUserId}`)
        ]);
    }
}
//# sourceMappingURL=cache-invalidation.service.js.map