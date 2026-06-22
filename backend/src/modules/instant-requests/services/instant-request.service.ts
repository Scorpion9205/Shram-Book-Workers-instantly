import prisma from "../../../shared/config/prisma.js";
import type { CreateInstantRequestInput } from "../validations/instant-request.validation.js";
import { FareService } from "../../../shared/services/pricing/fare.service.js";
import { getIO } from "../../../socket/socket.js";
import { calculateDistance } from "../../../shared/utils/distance.js";

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

              description:
                description ?? null,

              latitude,
              longitude,

              address:
                address ?? null,

              amount: fare.total,

              expiresAt: new Date(
                Date.now() +
                30 * 60 * 1000
              ),
            },
          });

        await tx.instantRequestItem.createMany({
          data: items.map(
            (item) => ({
              requestId:
                request.id,

              skillId:
                item.skillId,

              requiredWorkers:
                item.requiredWorkers,
            })
          ),
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

        if (!createdRequest) {
          throw new Error(
            "Request not found"
          );
        }

        const io = getIO();

        for (
          const item of createdRequest.items
        ) {

          io.to(
            `skill:${item.skillId}`
          ).emit(
            "instant_request_created",
            {
              requestId:
                createdRequest.id,

              itemId:
                item.id,

              title:
                createdRequest.title,

              skillId:
                item.skillId,

              requiredWorkers:
                item.requiredWorkers,
            }
          );

        }

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

          expiresAt: {
            gt: new Date(),
          },

          items: {
            some: {
              skillId: {
                in: skillIds,
              },

              status: "OPEN",
            },
          },
        },

        select: {
          id: true,

          title: true,

          description: true,

          amount: true,

          address: true,

          latitude: true,
          longitude: true,

          createdAt: true,

          provider: {
            select: {
              name: true,
            },
          },

          items: {
            where: {
              skillId: {
                in: skillIds,
              },

              status: "OPEN",
            },

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

    const SEARCH_RADIUS_KM = 10;

    const nearbyRequests =
      requests
        .map((request) => {

          const distance =
            calculateDistance(
              workerLocation.latitude,
              workerLocation.longitude,

              request.latitude,
              request.longitude
            );

          return {
            ...request,

            distanceKm:
              Number(
                distance.toFixed(2)
              ),
          };
        })
        .filter(
          (request) =>
            request.distanceKm <=
            SEARCH_RADIUS_KM
        )
        .sort(
          (a, b) =>
            a.distanceKm -
            b.distanceKm
        );

    return nearbyRequests;
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

        const response =
          await tx.instantRequestResponse.create({
            data: {
              itemId,
              workerId: worker.id,
              status: "ACCEPTED",
            },
          });

        await tx.booking.create({
          data: {
            providerId: item.request.providerId,

            workerId: worker.id,

            instantRequestId: item.request.id,

            instantRequestResponseId: response.id,

            amount: 0,

            status: "CONFIRMED",
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


        if (
          updatedItem.acceptedWorkers >=
          updatedItem.requiredWorkers
        ) {

          await tx.instantRequestItem.update({
            where: {
              id: itemId,
            },

            data: {
              status: "FILLED",
            },
          });

        }


        const openItems =
          await tx.instantRequestItem.count({
            where: {
              requestId: item.requestId,
              status: "OPEN",
            },
          });

        if (openItems === 0) {

          await tx.instantRequest.update({
            where: {
              id: item.requestId,
            },

            data: {
              status: "FILLED",
            },
          });

        }
        const io = getIO();

        io.emit(
          "worker_accepted",
          {
            workerId: worker.id,
            requestId: item.requestId,
            itemId,
          }
        );

        const finalItem =
          await tx.instantRequestItem.findUnique({
            where: {
              id: itemId,
            },
          });

        return finalItem;
      }
    );
  }


  static async getMyRequests(
    userId: string
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

    const requests =
      await prisma.instantRequest.findMany({
        where: {
          providerId: userId,
        },

        select: {
          id: true,

          title: true,

          amount: true,

          status: true,

          createdAt: true,

          items: {
            select: {
              id: true,

              requiredWorkers: true,

              acceptedWorkers: true,

              skill: {
                select: {
                  name: true,
                },
              },

              responses: {
                select: {
                  status: true,

                  worker: {
                    select: {
                      user: {
                        select: {
                          name: true,
                          phone: true,
                        },
                      },
                    },
                  },
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
}