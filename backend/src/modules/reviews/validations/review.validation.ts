import { z } from "zod";

export const createReviewSchema =
  z.object({
    rating: z
      .number()
      .min(1)
      .max(5),

    comment: z
      .string()
      .max(1000, "Comment must be at most 1000 characters")
      .optional(),
  });

export type CreateReviewInput =
  z.infer<
    typeof createReviewSchema
  >;