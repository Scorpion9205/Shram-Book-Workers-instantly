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

}