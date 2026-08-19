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
        branch = get_user_branch(request.user)
        if not branch:
            return Response({'detail': 'You have no branch assigned.'}, status=status.HTTP_400_BAD_REQUEST)

        date = request.data.get('date')
        exchange_rate = request.data.get('exchange_rate')
        if not date:
            return Response({'detail': 'date is required.'}, status=status.HTTP_400_BAD_REQUEST)

        SaleDate.objects.filter(branch=branch, is_open=True).update(
            is_open=False, closed_at=timezone.now(), closed_by=request.user
        )
        sale_date, _ = SaleDate.objects.update_or_create(
            branch=branch, date=date,
            defaults={
                'exchange_rate': exchange_rate,
                'is_open': True,
                'opened_at': timezone.now(),
                'opened_by': request.user,
                'closed_at': None,
                'closed_by': None,
            }
        )
        return Response(SaleDateSerializer(sale_date).data)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def set_exchange_rate(self, request):
        """POST /api/sale-dates/set_exchange_rate/ — set/update the rate once RBZ publishes it."""
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

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def close(self, request):
        branch = get_user_branch(request.user)
        if not branch:
            return Response({'detail': 'You have no branch assigned.'}, status=status.HTTP_400_BAD_REQUEST)

        sale_date = SaleDate.objects.filter(branch=branch, is_open=True).first()
        if not sale_date:
            return Response({'detail': 'No sale date is currently open for your branch.'}, status=status.HTTP_400_BAD_REQUEST)
        sale_date.is_open = False
        sale_date.closed_at = timezone.now()
        sale_date.closed_by = request.user
        sale_date.save(update_fields=['is_open', 'closed_at', 'closed_by'])
        return Response(SaleDateSerializer(sale_date).data)