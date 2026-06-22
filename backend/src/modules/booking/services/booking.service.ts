import prisma from "../../../shared/config/prisma.js";

export class BookingService {

  static async getProviderBookings(
    userId: string
  ) {

    return await prisma.booking.findMany({
      where: {
        providerId: userId,
      },

      select: {
        id: true,

        amount: true,

        status: true,

        createdAt: true,

        worker: {
          select: {
            id: true,

            user: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        },

        instantRequest: {
          select: {
            title: true,
            address: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  }

  static async getWorkerBookings(
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

    return await prisma.booking.findMany({
      where: {
        workerId: worker.id,
      },

      select: {
        id: true,

        amount: true,

        status: true,

        createdAt: true,

        provider: {
          select: {
            name: true,
            phone: true,
          },
        },

        instantRequest: {
          select: {
            title: true,
            address: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  }

  static async getBookingById(
    bookingId: string
  ) {

    const booking =
      await prisma.booking.findUnique({
        where: {
          id: bookingId,
        },

        include: {
          provider: {
            select: {
              name: true,
              phone: true,
            },
          },

          worker: {
            include: {
              user: {
                select: {
                  name: true,
                  phone: true,
                },
              },
            },
          },

          instantRequest: true,
        },
      });

    if (!booking) {
      throw new Error(
        "Booking not found"
      );
    }

    return booking;

  }

  static async startWork(
    bookingId: string,
    userId: string
  ) {

    const booking =
      await prisma.booking.findUnique({
        where: {
          id: bookingId,
        },

        include: {
          worker: true,
        },
      });

    if (!booking) {
      throw new Error(
        "Booking not found"
      );
    }

    if (
      booking.worker?.userId !==
      userId
    ) {
      throw new Error(
        "Unauthorized"
      );
    }

    if (
      booking.status !== "CONFIRMED"
    ) {
      throw new Error(
        "Booking is not confirmed"
      );
    }

    return await prisma.booking.update({
      where: {
        id: bookingId,
      },

      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    });
  }

 static async completeWork(
  bookingId: string,
  userId: string
) {

  const booking =
    await prisma.booking.findUnique({
      where: {
        id: bookingId,
      },

      include: {
        worker: true,
      },
    });

  if (!booking) {
    throw new Error(
      "Booking not found"
    );
  }

  if (
    booking.worker?.userId !==
    userId
  ) {
    throw new Error(
      "Unauthorized"
    );
  }

  if (
    booking.status !==
    "IN_PROGRESS"
  ) {
    throw new Error(
      "Booking is not in progress"
    );
  }

  return await prisma.$transaction(
    async (tx) => {

      const updatedBooking =
        await tx.booking.update({
          where: {
            id: bookingId,
          },

          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });

      await tx.workerProfile.update({
        where: {
          id: booking.workerId!,
        },

        data: {
          totalJobs: {
            increment: 1,
          },

          isAvailable: true,
        },
      });

      if (
        booking.instantRequestId
      ) {

        await tx.instantRequest.update({
          where: {
            id: booking.instantRequestId,
          },

          data: {
            status: "COMPLETED",
          },
        });

      }

      return updatedBooking;

    }
  );
}

}