from rest_framework.permissions import BasePermission, SAFE_METHODS
from .access import is_branch_admin, has_module


def _authed(request):
    return bool(request.user and request.user.is_authenticated)


class IsBranchAdmin(BasePermission):
    def has_permission(self, request, view):
        return is_branch_admin(request.user)


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return _authed(request) and request.user.is_superuser


class IsAdminOrReadOnly(BasePermission):
    """Read: any logged-in user. Write: branch admin or super admin."""
    def has_permission(self, request, view):
        if not _authed(request):
            return False
        return request.method in SAFE_METHODS or is_branch_admin(request.user)


class IsSuperAdminOrReadOnly(BasePermission):
    """Read: any logged-in user. Write: super admin only (system-wide settings)."""
    def has_permission(self, request, view):
        if not _authed(request):
            return False
        return request.method in SAFE_METHODS or request.user.is_superuser


def module_permission(module):
    class _HasModuleAccess(BasePermission):
        message = "Your role does not have access to this module."

        def has_permission(self, request, view):
            return _authed(request) and has_module(request.user, module)
    return _HasModuleAccess


def module_or_readonly(module):
    class _ModuleOrReadOnly(BasePermission):
        message = "Your role does not have access to this module."

        def has_permission(self, request, view):
            if not _authed(request):
                return False
            return request.method in SAFE_METHODS or has_module(request.user, module)
    return _ModuleOrReadOnly