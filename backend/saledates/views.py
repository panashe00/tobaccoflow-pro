from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .models import SaleDate
from .serializers import SaleDateSerializer


def get_user_branch(user):
    if not user.branches:
        return None
    return user.branches[0]


class SaleDateViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SaleDate.objects.all()
    serializer_class = SaleDateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        branch = get_user_branch(self.request.user)
        return super().get_queryset().filter(branch=branch) if branch else super().get_queryset().none()

    @action(detail=False, methods=['get'])
    def current(self, request):
        branch = get_user_branch(request.user)
        if not branch:
            return Response({'detail': 'You have no branch assigned.'}, status=status.HTTP_400_BAD_REQUEST)
        sale_date = SaleDate.objects.filter(branch=branch, is_open=True).first()
        if not sale_date:
            return Response(None)
        return Response(SaleDateSerializer(sale_date).data)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def open(self, request):
        """Opens a new sale date, atomically closing whichever one is currently open for this branch (if any)."""
        branch = get_user_branch(request.user)
        if not branch:
            return Response({'detail': 'You have no branch assigned.'}, status=status.HTTP_400_BAD_REQUEST)

        date = request.data.get('date')
        exchange_rate = request.data.get('exchange_rate')
        if not date:
            return Response({'detail': 'date is required.'}, status=status.HTTP_400_BAD_REQUEST)

        existing = SaleDate.objects.filter(branch=branch, date=date).first()
        if existing and not existing.is_open and existing.closed_at is not None:
            return Response(
                {'detail': 'This sale date has already been closed and cannot be reopened.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        SaleDate.objects.filter(branch=branch, is_open=True).update(
            is_open=False, closed_at=timezone.now(), closed_by=request.user
        )

        if existing:
            existing.exchange_rate = exchange_rate if exchange_rate is not None else existing.exchange_rate
            existing.is_open = True
            existing.opened_at = timezone.now()
            existing.opened_by = request.user
            existing.closed_at = None
            existing.closed_by = None
            existing.save()
            sale_date = existing
        else:
            sale_date = SaleDate.objects.create(
                branch=branch, date=date, exchange_rate=exchange_rate,
                is_open=True, opened_at=timezone.now(), opened_by=request.user,
            )
        return Response(SaleDateSerializer(sale_date).data)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def set_exchange_rate(self, request):
        branch = get_user_branch(request.user)
        exchange_rate = request.data.get('exchange_rate')
        if exchange_rate is None:
            return Response({'detail': 'exchange_rate is required.'}, status=status.HTTP_400_BAD_REQUEST)

        sale_date = SaleDate.objects.filter(branch=branch, is_open=True).first()
        if not sale_date:
            return Response({'detail': 'No sale date is currently open for your branch.'}, status=status.HTTP_400_BAD_REQUEST)

        sale_date.exchange_rate = exchange_rate
        sale_date.save(update_fields=['exchange_rate'])
        return Response(SaleDateSerializer(sale_date).data)