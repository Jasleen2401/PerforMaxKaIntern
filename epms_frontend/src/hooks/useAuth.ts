import type { RootState } from "../app/store";
import { logout } from "../features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "./reduxHooks";
import { useLogoutUserApiMutation, useGetMeQuery } from "../features/auth/authApi";
import { useGetActiveCycleQuery } from "../services/kpiApi";

const normalizeRole = (role: string) => role.replace("ROLE_", "");

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const [logoutApi] = useLogoutUserApiMutation();

  const { user, isAuthenticated, accessToken, refreshToken } = useAppSelector(
    (state: RootState) => state.auth,
  );

  const { isLoading: isLoadingUser } = useGetMeQuery(undefined, {
    skip: !accessToken || !!user,
  });

  const { data: cycleResponse, isLoading: isLoadingCycle, error: cycleError } = useGetActiveCycleQuery(undefined, {
    skip: !isAuthenticated,
  });

  const logoutUser = async () => {
    try {
      await logoutApi().unwrap();
    } catch (err) {
      console.error("Logout API failed:", err);
    } finally {
      dispatch(logout());
      // Optional: Redirect or reload to ensure clean state
      window.location.href = "/login";
    }
  };

  const isAdmin = Boolean(
    user && (
      user.roles?.some(r => ["ADMIN", "SUPER_ADMIN", "ROLE_ADMIN", "ROLE_SUPER_ADMIN"].includes(normalizeRole(r))) ||
      ["ADMIN", "SUPER_ADMIN"].includes(normalizeRole(user.role || "")) ||
      (user as any).is_superuser === true ||
      user.username?.toLowerCase() === "admin"
    )
  );

  const hasRole = (role: string) => {
    if (!user) return false;
    const norm = normalizeRole(role);
    if (isAdmin && (norm === "ADMIN" || norm === "SUPER_ADMIN" || norm === "HR" || norm === "MANAGER" || norm === "EMPLOYEE")) return true;
    if (user.role && normalizeRole(user.role) === norm) return true;
    if (user.roles && user.roles.map(normalizeRole).includes(norm)) return true;
    return false;
  };

  const hasAnyRole = (roles: string[]) => {
    if (!user) return false;
    if (isAdmin) return true;
    return roles.some(role => hasRole(role));
  };

  const hasPermission = (permission: string) => {
    if (isAdmin) return true;
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  return {
    user,
    isAuthenticated,
    accessToken,
    refreshToken,
    logout: logoutUser,
    hasRole,
    hasAnyRole,
    hasPermission,
    isAdmin,
    isManager: isAdmin || hasRole("MANAGER"),
    isHR: isAdmin || hasRole("HR"),
    isEmployee: isAdmin || hasRole("EMPLOYEE"),
    // ABAC Helpers - Admin has top seniority and passes all rank checks
    isSenior: isAdmin ? true : (user ? user.levelRank <= 4 : false),
    isJunior: isAdmin ? false : (user ? user.levelRank >= 7 : false),
    isTopManagement: isAdmin ? true : (user ? user.levelRank <= 3 : false),   // L01–L03: Chairman, CEO, COO, ED, GM
    isDeptHead: isAdmin ? true : (user ? user.levelRank === 4 : false),       // L04: Dept heads & senior officers
    isMidLevel: isAdmin ? true : (user ? (user.levelRank >= 5 && user.levelRank <= 6) : false), // L05–L06: Managers, team leads
    isOperational: isAdmin ? true : (user ? user.levelRank >= 7 : false),     // L07–L09: Juniors, OJT, support staff
    // Cycle Info
    activeCycleId: cycleResponse?.data?.cycleId,
    activeCycleName: cycleResponse?.data?.cycleName || 'No Active Cycle',
    hasCycle: !!cycleResponse?.data?.cycleId,
    isLoading: isLoadingUser || isLoadingCycle,
    isLoadingCycle,
    cycleError,
  };
};
