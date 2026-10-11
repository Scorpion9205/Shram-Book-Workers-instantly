import { RedisService } from "../redis/redis.service.js";

export class CacheInvalidationService {

  static async afterJobCreated(
    providerUserId: string
  ) {

    await Promise.all([

      RedisService.del(
        `dashboard:provider:${providerUserId}`
      ),

      // JobService.getAllJobs actually caches under `jobs:worker:${userId}` /
      // `jobs:agent:${userId}` (per-viewer, not a shared "nearby" key) — "jobs:nearby:*" never
      // matched any real key, so this invalidation was a complete no-op: a newly-posted job
      // stayed invisible in everyone's cached feed for the full 120s TTL.
      RedisService.deletePattern("jobs:worker:*"),
      RedisService.deletePattern("jobs:agent:*"),

    ]);

  }

  static async afterJobAccepted(
    providerUserId: string,
    workerUserId?: string | null,
    agentUserId?: string | null
  ) {

    const promises: Promise<any>[] = [
      RedisService.del(
        `dashboard:provider:${providerUserId}`
      ),

      // See the identical comment in afterJobCreated — same dead-pattern bug.
      RedisService.deletePattern("jobs:worker:*"),
      RedisService.deletePattern("jobs:agent:*"),
    ];

    if (workerUserId) {
      promises.push(
        RedisService.del(
          `dashboard:worker:${workerUserId}`
        )
      );
    }

    await Promise.all(promises);

  }

  static async afterBookingCompleted(
    providerUserId: string,
    workerUserId: string
  ) {

    await Promise.all([

      RedisService.del(
        `dashboard:provider:${providerUserId}`
      ),

      RedisService.del(
        `dashboard:worker:${workerUserId}`
      )

    ]);

  }

  static async afterReviewAdded(
    workerUserId: string
  ) {

    await RedisService.del(
      `dashboard:worker:${workerUserId}`
    );

  }

  static async afterInstantRequestCreated(
    providerUserId: string
  ) {

    await Promise.all([

      RedisService.del(
        `dashboard:provider:${providerUserId}`
      ),

      RedisService.deletePattern(
        "requests:nearby:*"
      )

    ]);

  }

  static async afterInstantRequestAccepted(
    providerUserId: string,
    workerUserId: string
  ) {

    await Promise.all([

      RedisService.del(
        `dashboard:provider:${providerUserId}`
      ),

      RedisService.del(
        `dashboard:worker:${workerUserId}`
      ),

      RedisService.deletePattern(
        "requests:nearby:*"
      )

    ]);

  }

  static async afterInstantRequestCompleted(
    providerUserId: string,
    workerUserId: string
  ) {

    await Promise.all([

      RedisService.del(
        `dashboard:provider:${providerUserId}`
      ),

      RedisService.del(
        `dashboard:worker:${workerUserId}`
      )

    ]);

  }

}