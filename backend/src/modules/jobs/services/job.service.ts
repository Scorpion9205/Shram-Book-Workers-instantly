import prisma from "../../../shared/config/prisma.js";
import type { CreateJobInput } from "../validations/job.validation.js";
import { calculateDistance } from "../../../shared/utils/distance.js";
import type { ApplyJobInput } from "../validations/job.validation.js";

export class JobService {

  static async createJob(
    userId: string,
    data: CreateJobInput
  ) {

    const provider =
      await prisma.providerProfile.findUnique({
        where: {
          userId,
        },
      });

    if (!provider) {
      throw new Error(
        "Provider profile not found"
      );
    }

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

    return job;
  }

  static async getAllJobs(
    userId: string
  ) {

    const worker =
      await prisma.workerProfile.findUnique({
        where: {
          userId,
        },

        include: {
          skills: true,
        },
      });

    if (!worker) {
      throw new Error(
        "Worker profile not found"
      );
    }

    const workerLocation =
      await prisma.userLocation.findUnique({
        where: {
          userId,
        },
      });

    if (!workerLocation) {
      throw new Error(
        "Worker location not found"
      );
    }

    const skillIds =
      worker.skills.map(
        (skill) => skill.skillId
      );

    if (skillIds.length === 0) {
      return [];
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

    const nearbyJobs =
      jobs
        .map((job) => {

          const distance =
            calculateDistance(
              workerLocation.latitude,
              workerLocation.longitude,

              job.latitude,
              job.longitude
            );

          return {
            ...job,

            distanceKm:
              Number(
                distance.toFixed(2)
              ),
          };
        })
        .filter(
          (job) =>
            job.distanceKm <=
            SEARCH_RADIUS_KM
        )
        .sort(
          (a, b) =>
            a.distanceKm -
            b.distanceKm
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

        workerId: worker.id,

        bidAmount:
          data.bidAmount,

        status: "PENDING",
      },
    });

  return application;
}

}