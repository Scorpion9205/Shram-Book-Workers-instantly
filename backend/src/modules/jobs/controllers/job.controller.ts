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

      const result = await JobService.getAllJobs(req.user!.userId);

      return res.status(200).json({
        success: true,
        locationRequired: result.locationRequired,
        jobs: result.jobs,
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
     
      console.log("BODY =>", req.body);
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
  static async getJobApplications(
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

      const applications =
        await JobService.getJobApplications(
          req.user!.userId,
          jobId
        );

      return res.status(200).json({
        success: true,
        applications,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });

    }

  }
  static async acceptApplication(
    req: AuthRequest,
    res: Response
  ) {

    try {

      const applicationId =
        req.params.applicationId;

      if (
        !applicationId ||
        Array.isArray(applicationId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid application id",
        });
      }

      const result =
        await JobService.acceptApplication(
          req.user!.userId,
          applicationId
        );

      return res.status(200).json({
        success: true,
        message:
          "Application accepted successfully",
        data: result,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });

    }

  }

  static async rejectApplication(
    req: AuthRequest,
    res: Response
  ) {

    try {

      const applicationId =
        req.params.applicationId;

      if (
        !applicationId ||
        Array.isArray(applicationId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid application id",
        });
      }

      await JobService.rejectApplication(
        req.user!.userId,
        applicationId
      );

      return res.status(200).json({
        success: true,
        message:
          "Application rejected successfully",
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });

    }

  }

  static async getMyApplications(
    req: AuthRequest,
    res: Response
  ) {

    try {

      const applications =
        await JobService.getMyApplications(
          req.user!.userId
        );

      return res.status(200).json({
        success: true,
        applications,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });

    }

  }

  static async getProviderJobs(
    req: AuthRequest,
    res: Response
  ) {

    try {

      const jobs =
        await JobService.getProviderJobs(
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
}