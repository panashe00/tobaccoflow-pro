from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from deliverynotes.models import DeliveryNote
from dispatch.models import DispatchLoad
from saledates.models import SaleDate
from users.permissions import IsSuperAdmin
from .models import Season
from .scoping import current_season


def season_data(s):
    return {'id': s.id, 'name': s.name, 'is_open': s.is_open, 'opened_at': s.opened_at, 'closed_at': s.closed_at}


class SeasonViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        return Response([season_data(s) for s in Season.objects.all()])

    @action(detail=False, methods=['get'])
    def current(self, request):
        s = current_season()
        return Response(season_data(s) if s else None)

    @action(detail=False, methods=['get'], url_path='close-summary', permission_classes=[IsSuperAdmin])
    def close_summary(self, request):
        s = current_season()
        if not s:
            return Response({'detail': 'No season is currently open.'}, status=400)
        return Response({
            'season': season_data(s),
            'open_sale_dates': SaleDate.objects.filter(season=s, is_open=True).count(),
            'open_loads': DispatchLoad.objects.filter(season=s, is_open=True).count(),
            'notes_without_salesheet': DeliveryNote.objects.filter(sale_date__season=s, salesheet__isnull=True).count(),
        })

    @action(detail=False, methods=['post'], permission_classes=[IsSuperAdmin])
    def open(self, request):
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'detail': 'A season name is required.'}, status=400)
        if current_season():
            return Response({'detail': 'A season is already open. Close it before opening a new one.'}, status=400)
        if Season.objects.filter(name__iexact=name).exists():
            return Response({'detail': f"A season named '{name}' already exists."}, status=400)
        s = Season.objects.create(name=name, opened_by=request.user)
        return Response(season_data(s), status=201)

    @action(detail=False, methods=['post'], permission_classes=[IsSuperAdmin])
    def close(self, request):
        s = current_season()
        if not s:
            return Response({'detail': 'No season is currently open.'}, status=400)
        if (request.data.get('confirm_name') or '').strip() != s.name:
            return Response({'detail': 'Type the season name exactly to confirm.'}, status=400)

        with transaction.atomic():
            now = timezone.now()
            SaleDate.objects.filter(season=s, is_open=True).update(is_open=False, closed_at=now, closed_by=request.user)
            DispatchLoad.objects.filter(season=s, is_open=True).update(is_open=False, closed_at=now, closed_by=request.user)
            s.is_open = False
            s.closed_at = now
            s.closed_by = request.user
            s.save(update_fields=['is_open', 'closed_at', 'closed_by'])
        return Response(season_data(s))