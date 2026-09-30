import type { Request } from "express";

export interface AuthRequest extends Request {
    user?: { id: string; userId: string; role: string }
}
