import prisma from "../../../shared/config/prisma.js";
import type {
    CreateReviewInput,
} from "../validations/review.validation.js";

export class ReviewService {

    static async createReview(
        bookingId: string,
        providerId: string,
        data: CreateReviewInput
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
            booking.providerId !==
            providerId
        ) {
            throw new Error(
                "Unauthorized"
            );
        }

        if (
            booking.status !==
            "COMPLETED"
        ) {
            throw new Error(
                "Booking not completed"
            );
        }

        const existingReview =
            await prisma.review.findUnique({
                where: {
                    bookingId,
                },
            });

        if (existingReview) {
            throw new Error(
                "Review already exists"
            );
        }

        return await prisma.$transaction(
            async (tx) => {

                const review =
                    await tx.review.create({
                        data: {
                            bookingId,

                            providerId,

                            workerId:
                                booking.workerId!,

                            rating:
                                data.rating,

                            comment:
                                data.comment ?? null,
                        },
                    });

                const worker =
                    await tx.workerProfile.findUnique({
                        where: {
                            id:
                                booking.workerId!,
                        },
                    });

                const newRating =
                    (
                        worker!.rating *
                        worker!.totalReviews +
                        data.rating
                    ) /
                    (
                        worker!.totalReviews +
                        1
                    );

                await tx.workerProfile.update({
                    where: {
                        id:
                            booking.workerId!,
                    },

                    data: {
                        rating:
                            Number(
                                newRating.toFixed(2)
                            ),

                        totalReviews: {
                            increment: 1,
                        },
                    },
                });

                return review;
            }
        );
    }
    static async getWorkerRating(
        workerId: string
    ) {

        const worker =
            await prisma.workerProfile.findUnique({
                where: {
                    id: workerId,
                },

                select: {
                    id: true,
                    rating: true,
                    totalReviews: true,
                    totalJobs: true,
                },
            });

        if (!worker) {
            throw new Error(
                "Worker not found"
            );
        }

        return worker;
    }



}