from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from weighing.models import Bale
from weighing.barcodes import split_and_validate_scan
from .models import DispatchLoad, DispatchLoadBale
from .serializers import DispatchLoadSerializer


class DispatchLoadViewSet(viewsets.ModelViewSet):
    queryset = DispatchLoad.objects.all().prefetch_related('items__bale__delivery_note__grower', 'items__bale__processing')
    serializer_class = DispatchLoadSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        return qs.filter(branch__in=user.branches) if user.branches else qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        branch = user.branches[0] if user.branches else None
        if not branch:
            raise serializers.ValidationError("You have no branch assigned.")
        serializer.save(branch=branch, opened_by=user)

    @action(detail=False, methods=['get'])
    def open_loads(self, request):
        user = request.user
        branch = user.branches[0] if user.branches else None
        qs = self.get_queryset().filter(branch=branch, is_open=True)
        return Response(DispatchLoadSerializer(qs, many=True).data)

    @action(detail=True, methods=['post'], url_path='add-bale')
    def add_bale(self, request, pk=None):
        load = self.get_object()
        if not load.is_open:
            return Response({'detail': 'This load is closed and cannot accept more bales.'}, status=status.HTTP_400_BAD_REQUEST)

        scanned = request.data.get('barcode', '').strip()
        ticket_number, is_valid = split_and_validate_scan(scanned)
        if not is_valid:
            return Response({'detail': 'Invalid ticket barcode.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        branch = user.branches[0] if user.branches else None
        bale = Bale.objects.filter(ticket_number=ticket_number, branch=branch).select_related('delivery_note').first()
        if not bale:
            return Response({'detail': 'Ticket not found in the system.'}, status=status.HTTP_404_NOT_FOUND)

        if not hasattr(bale.delivery_note, 'salesheet'):
            return Response(
                {'detail': f"Ticket {ticket_number} does not have a salesheet generated yet and cannot be dispatched."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if hasattr(bale, 'dispatch_item'):
            return Response({'detail': f"Ticket {ticket_number} has already been dispatched on another load."}, status=status.HTTP_400_BAD_REQUEST)

        DispatchLoadBale.objects.create(load=load, bale=bale, scanned_by=user)

        load.refresh_from_db()  # clears the stale prefetch cache from get_object() above
        load = self.get_queryset().get(pk=load.pk)  # re-fetch with the prefetch applied fresh, including the new item
        return Response(DispatchLoadSerializer(load).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='remove-bale')
    def remove_bale(self, request, pk=None):
        load = self.get_object()
        if not load.is_open:
            return Response({'detail': 'This load is closed. Bales cannot be removed.'}, status=status.HTTP_400_BAD_REQUEST)

        item_id = request.data.get('item_id')
        item = DispatchLoadBale.objects.filter(pk=item_id, load=load).first()
        if not item:
            return Response({'detail': 'Bale not found on this load.'}, status=status.HTTP_404_NOT_FOUND)
        item.delete()

        load = self.get_queryset().get(pk=load.pk)
        return Response(DispatchLoadSerializer(load).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        from django.utils import timezone
        load = self.get_object()
        if not load.is_open:
            return Response({'detail': 'This load is already closed.'}, status=status.HTTP_400_BAD_REQUEST)
        load.is_open = False
        load.closed_by = request.user
        load.closed_at = timezone.now()
        load.save(update_fields=['is_open', 'closed_by', 'closed_at'])

        load = self.get_queryset().get(pk=load.pk)
        return Response(DispatchLoadSerializer(load).data)