import prisma from "../../../shared/config/prisma.js";
import type { CreateJobInput } from "../validations/job.validation.js";

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

}