import { useAuth } from "./useAuth";
import type { UserRole } from "@/types";

/**
 * UI-only role gating (show/hide, redirect). The backend's `authorize()` middleware
 * is the actual source of truth — this never substitutes for a server-side check.
 */
export function usePermission() {
  const { role } = useAuth();

  const hasRole = (...roles: UserRole[]): boolean => !!role && roles.includes(role);

  return {
    role,
    hasRole,
    isAdmin: role === "admin",
    isProvider: role === "provider",
    isWorker: role === "worker",
    isAgent: role === "agent",
  };
}
