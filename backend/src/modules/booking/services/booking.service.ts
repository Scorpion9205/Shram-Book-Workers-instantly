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

      startedAt: true,

      completedAt: true,

      worker: {
        select: {

          experience: true,

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

      instantRequest: {
        select: {
          id: true,
          title: true,
          address: true,
        },
      },

      job: {
        select: {
          id: true,
          title: true,
          address: true,
          city: true,
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

      startedAt: true,

      completedAt: true,

      provider: {
        select: {
          name: true,
          phone: true,
        },
      },

      instantRequest: {
        select: {
          id: true,
          title: true,
          address: true,
        },
      },

      job: {
        select: {
          id: true,
          title: true,
          address: true,
          city: true,
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
    booking.status !==
    "CONFIRMED"
  ) {
    throw new Error(
      "Booking is not confirmed"
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
            status: "IN_PROGRESS",
            startedAt: new Date(),
          },
        });

      await tx.workerProfile.update({
        where: {
          id: booking.workerId!,
        },

        data: {
          isAvailable: false,
        },
      });

      if (booking.jobId) {

        await tx.job.update({
          where: {
            id: booking.jobId,
          },

          data: {
            status: "IN_PROGRESS",
          },
        });

      }

     

      return updatedBooking;

    }
  );

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

      // Instant Request
      if (booking.instantRequestId) {

        const remainingInstantBookings =
          await tx.booking.count({
            where: {
              instantRequestId:
                booking.instantRequestId,

              status: {
                not: "COMPLETED",
              },
            },
          });

        if (
          remainingInstantBookings === 0
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

      }

      // Job Posting
      if (booking.jobId) {

        const remainingJobBookings =
          await tx.booking.count({
            where: {
              jobId: booking.jobId,

              status: {
                not: "COMPLETED",
              },
            },
          });

        if (
          remainingJobBookings === 0
        ) {

          await tx.job.update({
            where: {
              id: booking.jobId,
            },

            data: {
              status: "COMPLETED",
            },
          });

        }

      }

      return updatedBooking;

    }
  );

}

}