import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware.js";
import { UserRole } from "@prisma/client";
export declare const roleMiddleware: (...allowedRoles: UserRole[]) => (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=role.middleware.d.ts.map