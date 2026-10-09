import { Router } from "express";
import type { CategoryController } from "../controllers/CategoryController.js";
import { authenticate } from "../../auth/middleware/authenticate.middleware.js";
import { authorize } from "../../auth/middleware/role.middleware.js";
import { UserRole } from "../../../core/enums/Role.js";

export function createCategoryRouter(controller: CategoryController): Router {
  const router = Router();

  // Public read — categories are shown wherever Skills are browsed (signup, job posting, etc.)
  router.get("/", controller.getAllCategories);
  router.get("/:id", controller.getCategoryById);

  // Admin-only management
  router.post("/", authenticate, authorize(UserRole.ADMIN), controller.createCategory);
  router.put("/:id", authenticate, authorize(UserRole.ADMIN), controller.updateCategory);
  router.delete("/:id", authenticate, authorize(UserRole.ADMIN), controller.deleteCategory);

  return router;
}
