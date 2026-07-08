import prisma from "../../../shared/config/prisma.js";
import type { CreateJobInput } from "../validations/job.validation.js";
import { calculateDistance } from "../../../shared/utils/distance.js";
import type { ApplyJobInput } from "../validations/job.validation.js";
import { RedisService } from "../../../shared/services/redis/redis.service.js";
import { CacheInvalidationService } from "../../../shared/services/cache/cache-invalidation.service.js";
export class JobService {

  static async createJob(
    userId: string,
    data: CreateJobInput
  ) {

    await prisma.providerProfile.upsert({
      where: {
        userId,
      },
      update: {},
      create: {
        userId,
      },
    });

    const skill =
      await prisma.skill.findUnique({
        where: {
          id: data.skillId,
        },
      });

    if (!skill) {
      throw new Error(
        "Skill not found"
      );
    }

    const job =
      await prisma.job.create({
        data: {
          title: data.title,

          description:
            data.description ?? null,

          skillId:
            data.skillId,

          requiredWorkers:
            data.requiredWorkers,

          budget:
            data.budget ?? null,

          latitude:
            data.latitude,

          longitude:
            data.longitude,

          address:
            data.address ?? null,

          city:
            data.city ?? null,

          state:
            data.state ?? null,

          pincode:
            data.pincode ?? null,

          providerId:
            userId,
        },

        include: {
          skill: true,

          provider: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });


    await CacheInvalidationService.afterJobCreated(
      userId
    );

    return job;
  }

  static async getAllJobs(
    userId: string
  ) {

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        role: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    let cacheKey = "";
    let latitude = 0;
    let longitude = 0;
    let skillIds: string[] = [];

    if (user.role === "WORKER") {

      cacheKey = `jobs:nearby:worker:${userId}`;

      const worker = await prisma.workerProfile.findUnique({
        where: {
          userId,
        },
        include: {
          skills: true,
        },
      });

      if (!worker) {
        throw new Error("Worker profile not found");
      }

      const location =
        await prisma.userLocation.findUnique({
          where: {
            userId,
          },
        });

      if (!location) {
        throw new Error("Worker location not found");
      }

      latitude = location.latitude;
      longitude = location.longitude;

      skillIds = worker.skills.map(
        (skill) => skill.skillId
      );

    }

    else if (user.role === "AGENT") {

      cacheKey = `jobs:nearby:agent:${userId}`;

      const agent =
        await prisma.agentProfile.findUnique({
          where: {
            userId,
          },
        });

      if (!agent) {
        throw new Error("Agent profile not found");
      }

      const location =
        await prisma.userLocation.findUnique({
          where: {
            userId,
          },
        });

      if (!location) {
        throw new Error("Agent location not found");
      }

      latitude = location.latitude;
      longitude = location.longitude;

      const linkedWorkers =
        await prisma.agentWorker.findMany({

          where: {
            agentId: agent.id,
          },

          include: {

            worker: {

              include: {

                skills: true,

              },

            },

          },

        });

      skillIds = [

        ...new Set(

          linkedWorkers.flatMap((item) =>

            item.worker.skills.map(
              (skill) => skill.skillId
            )

          )

        ),

      ];

    }

    else {

      throw new Error(
        "Only workers and agents can access jobs."
      );

    }

    if (skillIds.length === 0) {
      return [];
    }

    const cachedJobs =
      await RedisService.get<any>(
        cacheKey
      );

    if (cachedJobs) {

      console.log(
        "✅ Nearby Jobs from Redis"
      );

      return cachedJobs;

    }

    const jobs =
      await prisma.job.findMany({

        where: {

          status: "OPEN",

          skillId: {

            in: skillIds,

          },

        },

        select: {

          id: true,

          title: true,

          description: true,

          budget: true,

          requiredWorkers: true,

          latitude: true,

          longitude: true,

          address: true,

          city: true,

          state: true,

          createdAt: true,

          skill: {

            select: {

              id: true,

              name: true,

            },

          },

          provider: {

            select: {

              id: true,

              name: true,

            },

          },

        },

        orderBy: {

          createdAt: "desc",

        },

      });

    const SEARCH_RADIUS_KM = 10;

    const nearbyJobs = jobs

      .map((job) => {

        const distance = calculateDistance(

          latitude,

          longitude,

          job.latitude,

          job.longitude

        );

        return {

          ...job,

          distanceKm: Number(
            distance.toFixed(2)
          ),

        };

      })

      .filter(

        (job) =>
          job.distanceKm <= SEARCH_RADIUS_KM

      )

      .sort(

        (a, b) =>
          a.distanceKm - b.distanceKm

      );

    await RedisService.set(

      cacheKey,

      nearbyJobs,

      120

    );

    console.log(
      "✅ Nearby Jobs Cached"
    );

    return nearbyJobs;

  }

  static async getJobById(
    jobId: string
  ) {

    const job =
      await prisma.job.findUnique({
        where: {
          id: jobId,
        },

        include: {
          skill: {
            select: {
              id: true,
              name: true,
              baseRate: true,
            },
          },

          provider: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      });

    if (!job) {
      throw new Error(
        "Job not found"
      );
    }

    return job;
  }

  static async applyForJob(
    userId: string,
    jobId: string,
    data: ApplyJobInput
  ) {

    const worker =
      await prisma.workerProfile.findUnique({
        where: {
          userId,
        },
      });

    if (!worker) {
      throw new Error(
        "Worker profile not found"
      );
    }

    const job =
      await prisma.job.findUnique({
        where: {
          id: jobId,
        },
      });

    if (!job) {
      throw new Error(
        "Job not found"
      );
    }

    if (job.status !== "OPEN") {
      throw new Error(
        "Job is closed"
      );
    }

    const alreadyApplied =
      await prisma.application.findFirst({
        where: {
          jobId,
          workerId: worker.id,
        },
      });

    if (alreadyApplied) {
      throw new Error(
        "You have already applied"
      );
    }

    const application =
      await prisma.application.create({
        data: {
          jobId,

          applicantType: "WORKER",

          workerId: worker.id,

          bidAmount:
            data.bidAmount,

          status: "PENDING",
        },
      });

    return application;
  }

  static async getJobApplications(
    userId: string,
    jobId: string
  ) {

    const job =
      await prisma.job.findUnique({
        where: {
          id: jobId,
        },
      });

    if (!job) {
      throw new Error(
        "Job not found"
      );
    }

    if (job.providerId !== userId) {
      throw new Error(
        "Unauthorized"
      );
    }

    const applications =
      await prisma.application.findMany({
        where: {
          jobId,
        },



        select: {

          id: true,

          bidAmount: true,

          workerCount: true,

          status: true,

          createdAt: true,

          worker: {
            select: {
              experience: true,
              dailyRate: true,
              rating: true,
              totalJobs: true,

              user: {
                select: {
                  name: true,
                  phone: true,
                  profileImage: true,
                },
              },
            },
          },

          agent: {
            select: {
              agencyName: true,

              rating: true,

              user: {
                select: {
                  name: true,
                  phone: true,
                  profileImage: true,
                },
              },
            },
          },

        },

        orderBy: {
          bidAmount: "asc",
        },

      });

    return applications;
  }
  static async acceptApplication(
    userId: string,
    applicationId: string
  ) {

    const result = await prisma.$transaction(
      async (tx) => {

        const application =
          await tx.application.findUnique({
            where: {
              id: applicationId,
            },

            include: {
              job: true,
              worker: true,
            },
          });

        if (!application) {
          throw new Error(
            "Application not found"
          );
        }

        if (!application.worker?.userId) {
          throw new Error(
            "Worker user not found"
          );
        }

        if (
          application.job.providerId !==
          userId
        ) {
          throw new Error(
            "Unauthorized"
          );
        }

        if (
          application.status !== "PENDING"
        ) {
          throw new Error(
            "Application already processed"
          );
        }

        if (
          application.job.status !==
          "OPEN"
        ) {
          throw new Error(
            "Job is closed"
          );
        }

        await tx.application.update({
          where: {
            id: applicationId,
          },

          data: {
            status: "ACCEPTED",
          },
        });

        await tx.booking.create({
          data: {

            jobId:
              application.jobId,

            providerId:
              application.job.providerId,

            workerId:
              application.workerId,

            amount:
              application.bidAmount ?? 0,

            status:
              "CONFIRMED",

          },
        });

        const updatedJob =
          await tx.job.update({
            where: {
              id:
                application.jobId,
            },

            data: {
              requiredWorkers: {
                decrement: 1,
              },
            },
          });

        if (
          updatedJob.requiredWorkers === 0
        ) {

          await tx.job.update({
            where: {
              id:
                updatedJob.id,
            },

            data: {
              status:
                "ASSIGNED",
            },
          });

          await tx.application.updateMany({
            where: {
              jobId:
                updatedJob.id,

              status:
                "PENDING",
            },

            data: {
              status:
                "REJECTED",
            },
          });

        }
        return {
          success: true,
          workerUserId: application.worker.userId,
        };
      }
    );
    await CacheInvalidationService.afterJobAccepted(
      userId,
      result.workerUserId
    );

    return {
      success: true
    };

  }

  static async rejectApplication(
    userId: string,
    applicationId: string
  ) {

    const application =
      await prisma.application.findUnique({
        where: {
          id: applicationId,
        },

        include: {
          job: true,
        },
      });

    if (!application) {
      throw new Error(
        "Application not found"
      );
    }

    if (
      application.job.providerId !==
      userId
    ) {
      throw new Error(
        "Unauthorized"
      );
    }

    if (
      application.status !== "PENDING"
    ) {
      throw new Error(
        "Application already processed"
      );
    }

    await prisma.application.update({
      where: {
        id: applicationId,
      },

      data: {
        status: "REJECTED",
      },
    });

    return {
      success: true,
    };

  }

  static async getMyApplications(
    userId: string
  ) {

    const worker =
      await prisma.workerProfile.findUnique({
        where: {
          userId,
        },
      });

    if (!worker) {
      throw new Error(
        "Worker profile not found"
      );
    }

    const applications =
      await prisma.application.findMany({
        where: {
          workerId: worker.id,
        },

        select: {
          id: true,

          bidAmount: true,

          status: true,

          createdAt: true,

          job: {
            select: {
              id: true,

              title: true,

              budget: true,

              address: true,

              city: true,

              requiredWorkers: true,

              status: true,

              provider: {
                select: {
                  name: true,
                  phone: true,
                },
              },

              skill: {
                select: {
                  name: true,
                },
              },
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return applications;
  }

  static async getProviderJobs(
    userId: string
  ) {

    const jobs =
      await prisma.job.findMany({
        where: {
          providerId: userId,
        },

        select: {

          id: true,

          title: true,

          budget: true,

          requiredWorkers: true,

          status: true,

          createdAt: true,

          skill: {
            select: {
              name: true,
            },
          },

          _count: {
            select: {
              applications: true,
              bookings: true,
            },
          },

        },

        orderBy: {
          createdAt: "desc",
        },

      });

    return jobs;

  }
}
