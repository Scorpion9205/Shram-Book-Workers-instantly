import { RedisService } from "../redis/redis.service.js";

export class CacheInvalidationService {

  // Dashboard cache keys are "dashboard:<role>:<userId>:<range>:<startDate>:<endDate>" (one per
  // date range the user looked at), so they are cleared with a pattern, not an exact key.
  // Called whenever a booking changes status, so earnings and counts update right away.
  static async afterBookingStatusChanged(
    providerUserId: string,
    workerUserId?: string | null
  ) {

    const jobs: Promise<any>[] = [
      RedisService.deletePattern(`dashboard:provider:${providerUserId}:*`),
    ];
    if (workerUserId) {
      jobs.push(RedisService.deletePattern(`dashboard:worker:${workerUserId}:*`));
    }
    await Promise.all(jobs);

  }

  static async afterJobCreated(
    providerUserId: string
  ) {

    await Promise.all([

      RedisService.deletePattern(`dashboard:provider:${providerUserId}:*`),

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
      RedisService.deletePattern(`dashboard:provider:${providerUserId}:*`),

      // See the identical comment in afterJobCreated — same dead-pattern bug.
      RedisService.deletePattern("jobs:worker:*"),
      RedisService.deletePattern("jobs:agent:*"),
    ];

    if (workerUserId) {
      promises.push(
        RedisService.deletePattern(`dashboard:worker:${workerUserId}:*`)
      );
    }

    await Promise.all(promises);

  }

  static async afterBookingCompleted(
    providerUserId: string,
    workerUserId: string
  ) {

    await Promise.all([

      RedisService.deletePattern(`dashboard:provider:${providerUserId}:*`),

      RedisService.deletePattern(`dashboard:worker:${workerUserId}:*`)

    ]);

  }

  static async afterReviewAdded(
    workerUserId: string
  ) {

    await RedisService.deletePattern(`dashboard:worker:${workerUserId}:*`);

  }

  static async afterInstantRequestCreated(
    providerUserId: string
  ) {

    await Promise.all([

      RedisService.deletePattern(`dashboard:provider:${providerUserId}:*`),

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

      RedisService.deletePattern(`dashboard:provider:${providerUserId}:*`),

      RedisService.deletePattern(`dashboard:worker:${workerUserId}:*`),

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

      RedisService.deletePattern(`dashboard:provider:${providerUserId}:*`),

      RedisService.deletePattern(`dashboard:worker:${workerUserId}:*`)

    ]);

  }

}