from rest_framework.permissions import BasePermission
from apps.accounts.models import UserRole

def is_admin_user(user):
    if not user or not user.is_authenticated:
        return False
    return bool(
        getattr(user, 'is_superuser', False) or
        user.role in (UserRole.SUPER_ADMIN, 'ADMIN', 'SUPER_ADMIN') or
        getattr(user, 'is_staff', False) or
        getattr(user, 'username', '') == 'admin' or
        getattr(user, 'is_super_admin', False)
    )

class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return is_admin_user(request.user)

class IsHR(BasePermission):
    def has_permission(self, request, view):
        if is_admin_user(request.user):
            return True
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in (UserRole.HR, UserRole.SUPER_ADMIN)
        )

class IsManager(BasePermission):
    def has_permission(self, request, view):
        if is_admin_user(request.user):
            return True
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in (UserRole.MANAGER, UserRole.HR, UserRole.SUPER_ADMIN)
        )

class IsIntern(BasePermission):
    def has_permission(self, request, view):
        if is_admin_user(request.user):
            return True
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == UserRole.INTERN
        )

class IsSelfOrManagerOrHR(BasePermission):
    """
    Object-level permission: Allows access if:
    - User is admin / superadmin (unrestricted access)
    - User is the owner (intern or employee)
    - User is the direct manager of the intern
    - User has HR or Super Admin role
    """
    def has_permission(self, request, view):
        if is_admin_user(request.user):
            return True
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        if is_admin_user(request.user):
            return True

        if request.user.role in (UserRole.HR, UserRole.SUPER_ADMIN):
            return True

        # Check target user
        target_user = getattr(obj, 'user', None)
        if target_user and target_user == request.user:
            return True

        # Check direct manager relationship
        manager = getattr(obj, 'manager', None)
        if manager and manager == request.user:
            return True

        return False
