from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    ChangePasswordSerializer, MyTokenObtainPairSerializer,
)
from .permissions import IsAdminOrReadOnly
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated


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
    permission_classes = [IsAdminOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ('update', 'partial_update'):
            return UserUpdateSerializer
        return UserSerializer

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """GET /api/users/me/ — current logged-in user's profile."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """POST /api/users/change_password/ — any logged-in user changes their own password."""
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'detail': 'Password updated.'}, status=status.HTTP_200_OK)