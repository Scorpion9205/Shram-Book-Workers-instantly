import type { Response } from "express";
import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js";
import { JobService } from "../services/job.service.js";
import { createJobSchema, applyJobSchema } from "../validations/job.validation.js";

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

  static async getAllJobs(
    req: AuthRequest,
    res: Response
  ) {

    try {

      const jobs =
        await JobService.getAllJobs(
          req.user!.userId
        );

      return res.status(200).json({
        success: true,
        jobs,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });

    }

  }
  static async getJobById(
    req: AuthRequest,
    res: Response
  ) {

    try {

      const jobId =
        req.params.jobId;

      if (
        !jobId ||
        Array.isArray(jobId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid job id",
        });
      }

      const job =
        await JobService.getJobById(
          jobId
        );

      return res.status(200).json({
        success: true,
        job,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });

    }

  }

  static async applyForJob(
    req: AuthRequest,
    res: Response
  ) {

    try {

      const jobId =
        req.params.jobId;

      if (
        !jobId ||
        Array.isArray(jobId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid job id",
        });
      }

      const validationResult =
        applyJobSchema.safeParse(
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

      const application =
        await JobService.applyForJob(
          req.user!.userId,
          jobId,
          validationResult.data
        );

      return res.status(201).json({
        success: true,

        message:
          "Applied successfully",

        application,
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