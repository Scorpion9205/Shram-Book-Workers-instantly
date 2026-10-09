import { useAppSelector } from "./redux";

export function useAuth() {
  const { user, accessToken, isAuthenticated, loading } = useAppSelector((s) => s.auth);

  return {
    user,
    accessToken,
    isAuthenticated,
    loading,
    role: user?.role ?? null,
  };
}
