import random
from django.db import models
from django.db.models import Count, F, Sum
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from saledates.models import SaleDate
from deliverynotes.models import DeliveryNote
from users.permissions import IsAdminOrReadOnly
from .models import Scale, HessianCode, TicketBook, Bale
from .serializers import (
    ScaleSerializer, HessianCodeSerializer, TicketBookSerializer,
    BaleSerializer, WeighingDeliveryNoteSerializer,
)

class ScaleViewSet(viewsets.ModelViewSet):
    queryset = Scale.objects.all()
    serializer_class = ScaleSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.branches:
            qs = qs.filter(branch__in=user.branches)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        branch = user.branches[0] if user.branches else None
        if not branch:
            raise serializers.ValidationError("You have no branch assigned.")
        serializer.save(branch=branch)

    @action(detail=True, methods=['get'])
    def read_mass(self, request, pk=None):
        """PLACEHOLDER: no real scale hardware/API is wired up yet.
        Returns a simulated reading so the UI flow can be built and tested.
        Replace with an actual serial/network call to the scale once that integration is scoped."""
        return Response({'mass': random.randint(60, 95)})


class HessianCodeViewSet(viewsets.ModelViewSet):
    queryset = HessianCode.objects.all()
    serializer_class = HessianCodeSerializer
    permission_classes = [IsAdminOrReadOnly]


class TicketBookViewSet(viewsets.ModelViewSet):
    queryset = TicketBook.objects.all()
    serializer_class = TicketBookSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.branches:
            qs = qs.filter(branch__in=user.branches)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        branch = user.branches[0] if user.branches else None
        if not branch:
            raise serializers.ValidationError("You have no branch assigned.")
        serializer.save(branch=branch)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def current(self, request):
        user = request.user
        branch = user.branches[0] if user.branches else None
        book = TicketBook.objects.filter(branch=branch, is_active=True).first()
        if not book:
            return Response(None)
        return Response(TicketBookSerializer(book).data)


class BaleViewSet(viewsets.ModelViewSet):
    queryset = Bale.objects.all()
    serializer_class = BaleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.branches:
            qs = qs.filter(branch__in=user.branches)
        dn_id = self.request.query_params.get('delivery_note')
        if dn_id:
            qs = qs.filter(delivery_note_id=dn_id)
        return qs

    @action(detail=False, methods=['get'], url_path='pending-delivery-notes')
    def pending_delivery_notes(self, request):
        """D-Notes still needing weighing: open sale date, not fully captured yet, not verified.
        Included regardless of pending/weighed status so a partially-weighed D-Note (status
        already flipped to 'weighed' after its first bale) doesn't disappear from this list."""
        user = request.user
        branch = user.branches[0] if user.branches else None

        qs = (
            DeliveryNote.objects.filter(branch=branch, sale_date__is_open=True)
            .exclude(status='verified')
            .select_related('grower', 'transporter')
            .annotate(bales_captured=Count('bales'))
            .filter(bales_captured__lt=F('number_of_bales'))
            .order_by('-created_at')
        )

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                models.Q(grower__first_name__icontains=search)
                | models.Q(grower__last_name__icontains=search)
                | models.Q(grower__grower_number__icontains=search)
            )
            count = qs.count()
            results = WeighingDeliveryNoteSerializer(qs, many=True).data
        else:
            count = qs.count()
            results = WeighingDeliveryNoteSerializer(qs[:5], many=True).data

        return Response({'count': count, 'results': results})

    @action(detail=False, methods=['get'], url_path='daily-summary')
    def daily_summary(self, request):
        user = request.user
        branch = user.branches[0] if user.branches else None
        sale_date = SaleDate.objects.filter(branch=branch, is_open=True).first()
        if not sale_date:
            return Response({'count': 0, 'total_mass': 0})
        agg = Bale.objects.filter(sale_date=sale_date, branch=branch).aggregate(
            count=Count('id'), total_mass=Sum('mass')
        )
        return Response({'count': agg['count'] or 0, 'total_mass': agg['total_mass'] or 0})