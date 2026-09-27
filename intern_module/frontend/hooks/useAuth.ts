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

  const { data: meUser, isLoading: isLoadingUser } = useGetMeQuery(undefined, {
    skip: !accessToken,
  });

  const currentUser = user || meUser;

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
    currentUser && (
      currentUser.roles?.some(r => ["ADMIN", "SUPER_ADMIN", "ROLE_ADMIN", "ROLE_SUPER_ADMIN"].includes(normalizeRole(r))) ||
      ["ADMIN", "SUPER_ADMIN"].includes(normalizeRole(currentUser.role || "")) ||
      (currentUser as any).is_superuser === true ||
      currentUser.username?.toLowerCase() === "admin"
    )
  );

  const hasRole = (role: string) => {
    if (!currentUser) return false;
    const norm = normalizeRole(role);
    if (isAdmin && (norm === "ADMIN" || norm === "SUPER_ADMIN" || norm === "HR" || norm === "MANAGER" || norm === "EMPLOYEE" || norm === "INTERN")) return true;
    if (currentUser.role && normalizeRole(currentUser.role) === norm) return true;
    if (currentUser.roles && currentUser.roles.map(normalizeRole).includes(norm)) return true;
    return false;
  };

  const hasAnyRole = (roles: string[]) => {
    if (!currentUser) return false;
    if (isAdmin) return true;
    return roles.some(role => hasRole(role));
  };

  const hasPermission = (permission: string) => {
    if (isAdmin) return true;
    if (!currentUser || !currentUser.permissions) return false;
    return currentUser.permissions.includes(permission);
  };

  return {
    user: currentUser,
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
    isEmployee: isAdmin || hasRole("EMPLOYEE") || hasRole("INTERN"),
    isIntern: hasRole("INTERN") || (currentUser ? (!isAdmin && !hasRole("MANAGER") && !hasRole("HR")) : false),
    // ABAC Helpers - Admin has top seniority and passes all rank checks
    isSenior: isAdmin ? true : (currentUser ? currentUser.levelRank <= 4 : false),
    isJunior: isAdmin ? false : (currentUser ? currentUser.levelRank >= 7 : false),
    isTopManagement: isAdmin ? true : (currentUser ? currentUser.levelRank <= 3 : false),   // L01–L03: Chairman, CEO, COO, ED, GM
    isDeptHead: isAdmin ? true : (currentUser ? currentUser.levelRank === 4 : false),       // L04: Dept heads & senior officers
    isMidLevel: isAdmin ? true : (currentUser ? (currentUser.levelRank >= 5 && currentUser.levelRank <= 6) : false), // L05–L06: Managers, team leads
    isOperational: isAdmin ? true : (currentUser ? currentUser.levelRank >= 7 : false),     // L07–L09: Juniors, OJT, support staff
    // Cycle Info
    activeCycleId: cycleResponse?.data?.cycleId,
    activeCycleName: cycleResponse?.data?.cycleName || 'No Active Cycle',
    hasCycle: !!cycleResponse?.data?.cycleId,
    isLoading: isLoadingUser || isLoadingCycle,
    isLoadingCycle,
    cycleError,
  };
};
