import type { UserRole } from "@/types";

export function dashboardPathForRole(role?: UserRole | null) {
  if (role === "provider") return "/provider/dashboard";
  if (role === "agent") return "/agent/dashboard";
  return "/worker/dashboard";
}
