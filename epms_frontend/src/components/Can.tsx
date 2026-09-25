import { useAuth } from '../hooks/useAuth';

interface CanProps {
  permission?: string;
  anyPermission?: string[];
  role?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const Can = ({
  permission,
  anyPermission,
  role,
  fallback = null,
  children,
}: CanProps) => {
  const { hasPermission, hasRole, isAdmin } = useAuth();

  if (isAdmin) {
    return <>{children}</>;
  }

  const permOk = permission
    ? hasPermission(permission)
    : anyPermission
    ? anyPermission.some(p => hasPermission(p))
    : true;

  const roleOk = role ? hasRole(role) : true;

  return permOk && roleOk ? <>{children}</> : <>{fallback}</>;
};
