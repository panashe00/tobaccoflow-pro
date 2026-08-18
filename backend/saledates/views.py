from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .models import SaleDate
from .serializers import SaleDateSerializer


class SaleDateViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SaleDate.objects.all()
    serializer_class = SaleDateSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def current(self, request):
        sale_date = SaleDate.objects.filter(is_open=True).first()
        if not sale_date:
            return Response(None)
        return Response(SaleDateSerializer(sale_date).data)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def open(self, request):
        date = request.data.get('date')
        exchange_rate = request.data.get('exchange_rate')
        if not date or exchange_rate is None:
            return Response({'detail': 'date and exchange_rate are required.'}, status=status.HTTP_400_BAD_REQUEST)

        SaleDate.objects.filter(is_open=True).update(
            is_open=False, closed_at=timezone.now(), closed_by=request.user
        )
        sale_date, _ = SaleDate.objects.update_or_create(
            date=date,
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
    def close(self, request):
        sale_date = SaleDate.objects.filter(is_open=True).first()
        if not sale_date:
            return Response({'detail': 'No sale date is currently open.'}, status=status.HTTP_400_BAD_REQUEST)
        sale_date.is_open = False
        sale_date.closed_at = timezone.now()
        sale_date.closed_by = request.user
        sale_date.save(update_fields=['is_open', 'closed_at', 'closed_by'])
        return Response(SaleDateSerializer(sale_date).data)