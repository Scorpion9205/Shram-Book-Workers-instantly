import { UserRole } from "@prisma/client";

export interface PendingSignupData {
  name: string;
  phone: string;
  email: string;
  password: string;
  role: UserRole;
}