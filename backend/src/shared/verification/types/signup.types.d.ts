import { UserRole } from "@prisma/client";
export interface PendingSignupData {
    name: string;
    phone: string;
    email: string;
    password: string;
    role: UserRole;
}
//# sourceMappingURL=signup.types.d.ts.map