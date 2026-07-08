import type { Response } from "express";
import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js";

import { AgentService } from "../services/agent.service.js";

import {
  createAgentProfileSchema,
  updateAgentProfileSchema,
} from "../validations/agent.validation.js";

export class AgentController {

  static async createProfile(
    req: AuthRequest,
    res: Response
  ) {

    try {

      const validation =
        createAgentProfileSchema.safeParse(
          req.body
        );

      if (!validation.success) {

        return res.status(400).json({
          success: false,
          errors:
            validation.error.flatten()
              .fieldErrors,
        });

      }

      const profile =
        await AgentService.createProfile(
          req.user!.userId,
          validation.data
        );

      return res.status(201).json({
        success: true,
        message:
          "Agent profile created successfully.",
        data: profile,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });

    }

  }

  static async getMyProfile(
    req: AuthRequest,
    res: Response
  ) {

    try {

      const profile =
        await AgentService.getMyProfile(
          req.user!.userId
        );

      return res.status(200).json({
        success: true,
        data: profile,
      });

    } catch (error: any) {

      return res.status(404).json({
        success: false,
        message: error.message,
      });

    }

  }

  static async updateProfile(
    req: AuthRequest,
    res: Response
  ) {

    try {

      const validation =
        updateAgentProfileSchema.safeParse(
          req.body
        );

      if (!validation.success) {

        return res.status(400).json({
          success: false,
          errors:
            validation.error.flatten()
              .fieldErrors,
        });

      }

      const profile =
        await AgentService.updateProfile(
          req.user!.userId,
          validation.data
        );

      return res.status(200).json({
        success: true,
        message:
          "Agent profile updated successfully.",
        data: profile,
      });

    } catch (error: any) {

      return res.status(400).json({
        success: false,
        message: error.message,
      });

    }

  }
  static async getDashboard(
    req: AuthRequest,
    res: Response
){

    try{

        const dashboard =
            await AgentService.getDashboard(

                req.user!.userId

            );

        return res.status(200).json({

            success:true,

            data:dashboard

        });

    }

    catch(error:any){

        return res.status(400).json({

            success:false,

            message:error.message

        });

    }

}

static async getMyApplications(
  req: AuthRequest,
  res: Response
) {

  try {

    const applications =
      await AgentService.getMyApplications(
        req.user!.userId
      );

    return res.status(200).json({

      success: true,

      data: applications,

    });

  }

  catch (error: any) {

    return res.status(400).json({

      success: false,

      message: error.message,

    });

  }

}

static async getMyBookings(
  req: AuthRequest,
  res: Response
) {

  try {

    const bookings =
      await AgentService.getMyBookings(
        req.user!.userId
      );

    return res.status(200).json({

      success: true,

      data: bookings,

    });

  }

  catch (error: any) {

    return res.status(400).json({

      success: false,

      message: error.message,

    });

  }

}

}