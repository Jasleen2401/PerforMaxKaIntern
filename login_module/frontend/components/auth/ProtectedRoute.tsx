import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useGetMeQuery } from "../../features/auth/authApi";

interface ProtectedRouteProps {
  allowedRoles?: string[];
  minLevel?: number;
  maxLevel?: number;
  requiredPermissions?: string[];
}

const ProtectedRoute = ({
  allowedRoles,
  minLevel,
  maxLevel,
  requiredPermissions,
}: ProtectedRouteProps) => {
  const { isAuthenticated, hasAnyRole, user, hasPermission, accessToken, isAdmin } = useAuth();
  const location = useLocation();

  // Track if the profile fetch failed
  const { isError } = useGetMeQuery(undefined, {
    skip: !accessToken || !!user,
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (accessToken && !user) {
    if (isError) {
      return <Navigate to="/login" replace />;
    }
    
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50/50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-sm font-medium text-gray-500 animate-pulse">Restoring Session...</p>
        </div>
      </div>
    );
  }

  // Force first-time password rotation before allowing any other application functionality
  const requiresPasswordChange = Boolean(
    (user as any)?.password_change_required ||
    (user as any)?.user?.password_change_required
  );

  if (requiresPasswordChange && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  // Admin has full unrestricted access across all routes
  if (isAdmin) {
    return <Outlet />;
  }


  // Role check
  if (allowedRoles && !hasAnyRole(allowedRoles)) {
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{ reason: `This page requires one of the following roles: ${allowedRoles.join(", ")}.` }}
      />
    );
  }

  // Level check (ABAC)
  if (user) {
    if (minLevel && user.levelRank > minLevel) {
      return (
        <Navigate
          to="/unauthorized"
          replace
          state={{ reason: `This page requires a minimum seniority level of L0${minLevel}.` }}
        />
      );
    }

    if (maxLevel && user.levelRank < maxLevel) {
      return (
        <Navigate
          to="/unauthorized"
          replace
          state={{ reason: `This page is limited to seniority level L0${maxLevel} or below.` }}
        />
      );
    }
  }

  // Permission check (ABAC)
  if (
    requiredPermissions &&
    !requiredPermissions.every((p) => hasPermission(p))
  ) {
    const missing = requiredPermissions.filter((permission) => !hasPermission(permission));
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{ reason: `Missing required permission(s): ${missing.join(", ")}.` }}
      />
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
