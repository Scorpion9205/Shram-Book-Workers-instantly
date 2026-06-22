import type { Response } from "express";
import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js";
import { JobService } from "../services/job.service.js";
import { createJobSchema } from "../validations/job.validation.js";

export class JobController {

  static async createJob(
    req: AuthRequest,
    res: Response
  ) {

    try {

      const validationResult =
        createJobSchema.safeParse(
          req.body
        );

      if (
        !validationResult.success
      ) {
        return res.status(400).json({
          success: false,

          errors:
            validationResult.error
              .flatten()
              .fieldErrors,
        });
      }

      const job =
        await JobService.createJob(
          req.user!.userId,
          validationResult.data
        );

      return res.status(201).json({
        success: true,

        message:
          "Job created successfully",

        job,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,

        message:
          error.message,
      });

    }

  }

}