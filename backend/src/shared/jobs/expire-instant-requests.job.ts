import cron from "node-cron";
import prisma from "../config/prisma.js";
import { getIO } from "../../socket/socket.js";

export const startExpireInstantRequestsJob =
  () => {

    cron.schedule(
      "*/1 * * * *",
      async () => {

        try {

          const expiredRequests =
            await prisma.instantRequest.findMany({
              where: {
                status: "OPEN",

                expiresAt: {
                  lt: new Date(),
                },
              },

              select: {
                id: true,
              },
            });

          if (
            expiredRequests.length === 0
          ) {
            return;
          }

          await prisma.instantRequest.updateMany({
            where: {
              id: {
                in: expiredRequests.map(
                  (request) =>
                    request.id
                ),
              },
            },

            data: {
              status: "EXPIRED",
            },
          });

          const io = getIO();

          for (
            const request of expiredRequests
          ) {

            io.emit(
              "request_expired",
              {
                requestId:
                  request.id,
              }
            );

          }

          console.log(
            `${expiredRequests.length} requests expired`
          );

        } catch (error) {

          console.error(
            "Expire Request Job Error:",
            error
          );

        }

      }
    );

    console.log(
      "Expire Instant Requests Job Started"
    );

  };