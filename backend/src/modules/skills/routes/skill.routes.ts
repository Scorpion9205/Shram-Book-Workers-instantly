import { Router } from "express";
import { SkillController } from "../controllers/skill.controller.js";
import { authMiddleware } from "../../../shared/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../shared/middleware/role.middleware.js";

const router = Router();

router.get(
  "/",
  SkillController.getSkills
);

router.post(
  "/worker",
  authMiddleware,
  roleMiddleware("WORKER"),
  SkillController.assignSkills
);

router.get(
  "/worker",
  authMiddleware,
  roleMiddleware("WORKER"),
  SkillController.getMySkills
);

export default router;