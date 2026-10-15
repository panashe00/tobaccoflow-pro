from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User, RolePermission
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    ChangePasswordSerializer, MyTokenObtainPairSerializer,
)
from .permissions import IsAdminOrReadOnly, IsBranchAdmin, IsSuperAdmin
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from .access import allowed_modules, role_matrix, MODULES, MODULE_KEYS


COOKIE_KWARGS = dict(
    httponly=True,
    secure=not settings.DEBUG,   # True in production (requires HTTPS)
    samesite='Lax',
    path='/',
)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = MyTokenObtainPairSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access = serializer.validated_data['access']
        refresh = serializer.validated_data['refresh']

        response = Response({'detail': 'Login successful.'})
        response.set_cookie('access_token', str(access), max_age=60 * 30, **COOKIE_KWARGS)
        response.set_cookie('refresh_token', str(refresh), max_age=60 * 60 * 24 * 7, **COOKIE_KWARGS)
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        response = Response({'detail': 'Logged out.'})
        response.delete_cookie('access_token', path='/')
        response.delete_cookie('refresh_token', path='/')
        return response

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('username')
    permission_classes = [IsBranchAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        if not user.branches:
            return qs.none()
        return qs.filter(branches__overlap=user.branches)

    def get_serializer_class(self):
        ...  # unchanged

    def _guard_target(self, target):
        actor = self.request.user
        if actor.is_superuser:
            return
        if target.is_superuser or (target.role == 'admin' and target.pk != actor.pk):
            raise PermissionDenied("Only a super admin can change another admin.")

    def perform_update(self, serializer):
        self._guard_target(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        if instance.pk == self.request.user.pk:
            raise ValidationError("You cannot delete your own account.")
        self._guard_target(instance)
        instance.delete()

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        data = UserSerializer(request.user).data
        data['is_superuser'] = request.user.is_superuser
        data['permissions'] = allowed_modules(request.user)
        return Response(data)

class RolePermissionView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        return Response({
            'modules': [{'key': k, 'label': l} for k, l in MODULES],
            'roles': [{'key': k, 'label': l, 'locked': k == 'admin'} for k, l in User.ROLE_CHOICES],
            'matrix': role_matrix(),
        })

    def patch(self, request):
        role, module, allowed = request.data.get('role'), request.data.get('module'), request.data.get('allowed')
        if role not in dict(User.ROLE_CHOICES) or role == 'admin':
            return Response({'detail': 'Invalid role.'}, status=400)
        if module not in MODULE_KEYS:
            return Response({'detail': 'Invalid module.'}, status=400)
        if not isinstance(allowed, bool):
            return Response({'detail': 'allowed must be true or false.'}, status=400)
        RolePermission.objects.update_or_create(role=role, module=module, defaults={'allowed': allowed})
        return Response(role_matrix())