import { Router } from "express";
import type { SkillController } from "../controllers/skill.controller.js";
import { authenticate } from "../../auth/middleware/authenticate.middleware.js";
import { authorize } from "../../auth/middleware/role.middleware.js";
import { UserRole } from "../../../core/enums/Role.js";

export function createSkillRouter(controller: SkillController): Router {
  const router = Router();

  router.get("/", controller.getSkills);
  router.post("/worker", authenticate, authorize(UserRole.WORKER), controller.assignSkills);
  router.get("/worker", authenticate, authorize(UserRole.WORKER), controller.getMySkills);

  return router;
}
