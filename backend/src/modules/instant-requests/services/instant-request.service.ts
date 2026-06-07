import prisma from "../../../shared/config/prisma.js";
import type { CreateInstantRequestInput } from "../validations/instant-request.validation.js";
import { FareService } from "../../../shared/services/pricing/fare.service.js";

export class InstantRequestService {

  static async createInstantRequest(
    userId: string,
    data: CreateInstantRequestInput
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

    const {
      title,
      description,
      latitude,
      longitude,
      address,

      items,
    } = data;

    return await prisma.$transaction(
      async (tx) => {

        const fare =
          await FareService.calculateInstantFare(
            items
          );

        const request =
          await tx.instantRequest.create({
            data: {
              providerId: userId,

              title,
              description: description ?? null,

              latitude,
              longitude,

              address: address ?? null,

              amount: fare.total,

              expiresAt: new Date(
                Date.now() + 30 * 60 * 1000
              ),
            },
          });

        await tx.instantRequestItem.createMany({
          data: items.map((item) => ({
            requestId: request.id,

            skillId: item.skillId,

            requiredWorkers:
              item.requiredWorkers,
          })),
        });

        const createdRequest =
          await tx.instantRequest.findUnique({
            where: {
              id: request.id,
            },

            include: {
              items: {
                include: {
                  skill: true,
                },
              },
            },
          });

        return createdRequest;
      }
    );
  }

  static async getNearbyRequests(
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

  const skillIds =
    worker.skills.map(
      (workerSkill) =>
        workerSkill.skillId
    );

  if (skillIds.length === 0) {
    return [];
  }

  const requests =
    await prisma.instantRequest.findMany({
      where: {
        status: "OPEN",

        items: {
          some: {
            skillId: {
              in: skillIds,
            },
          },
        },
      },

      select: {
        id: true,

        title: true,

        description: true,

        amount: true,

        address: true,

        createdAt: true,

        provider: {
          select: {
            name: true,
          },
        },

        items: {
          select: {
            id: true,

            requiredWorkers: true,

            acceptedWorkers: true,

            skill: {
              select: {
                id: true,

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

  return requests;
}


static async acceptRequest(
  userId: string,
  itemId: string
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

  return await prisma.$transaction(
    async (tx) => {

      const item =
        await tx.instantRequestItem.findUnique({
          where: {
            id: itemId,
          },

          include: {
            request: true,
          },
        });

      if (!item) {
        throw new Error(
          "Request item not found"
        );
      }

      if (item.request.status !== "OPEN") {
        throw new Error(
          "Request is closed"
        );
      }

      const hasSkill =
        worker.skills.some(
          (skill) =>
            skill.skillId === item.skillId
        );

      if (!hasSkill) {
        throw new Error(
          "You don't have required skill"
        );
      }

      const alreadyAccepted =
        await tx.instantRequestResponse.findFirst({
          where: {
            itemId,
            workerId: worker.id,
          },
        });

      if (alreadyAccepted) {
        throw new Error(
          "You already accepted this request"
        );
      }

      if (
        item.acceptedWorkers >=
        item.requiredWorkers
      ) {
        throw new Error(
          "All slots are filled"
        );
      }

      await tx.instantRequestResponse.create({
        data: {
          itemId,
          workerId: worker.id,
          status: "ACCEPTED",
        },
      });

      const updatedItem =
        await tx.instantRequestItem.update({
          where: {
            id: itemId,
          },

          data: {
            acceptedWorkers: {
              increment: 1,
            },
          },
        });

      return updatedItem;
    }
  );
}
}