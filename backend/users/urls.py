from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, LoginView, LogoutView, RolePermissionView

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('role-permissions/', RolePermissionView.as_view(), name='role-permissions'),
    path('', include(router.urls)),
]