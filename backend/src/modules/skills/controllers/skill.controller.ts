import type { Request, Response } from "express";
import { BaseController } from "../../../core/base/BaseController.js";
import type { ISkillService } from "../interfaces/ISkillService.js";
import { assignSkillsSchema } from "../validations/skill.validation.js";

export class SkillController extends BaseController {
  constructor(private readonly skillService: ISkillService) {
    super();
  }

  getSkills = async (_req: Request, res: Response): Promise<void> => {
    const skills = await this.skillService.getSkills();
    this.ok(res, { skills }, "Skills retrieved successfully");
  };

  assignSkills = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const data = this.validate(assignSkillsSchema, req.body);
    const skills = await this.skillService.assignSkills(user.userId, data.skillIds);
    this.ok(res, { skills }, "Skills assigned successfully");
  };

  getMySkills = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const skills = await this.skillService.getMySkills(user.userId);
    this.ok(res, { skills }, "My skills retrieved successfully");
  };
}
