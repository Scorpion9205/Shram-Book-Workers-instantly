import { RedisService } from "../redis/redis.service.js";

export class CacheInvalidationService {

  static async afterJobCreated(
    providerUserId: string
  ) {

    await Promise.all([

      RedisService.del(
        `dashboard:provider:${providerUserId}`
      ),

      RedisService.deletePattern(
        "jobs:nearby:*"
      )

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

      RedisService.deletePattern(
        "jobs:nearby:*"
      )
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