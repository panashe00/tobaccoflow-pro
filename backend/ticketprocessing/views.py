from django.db import models as dj_models
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from weighing.models import Bale
from weighing.barcodes import split_and_validate_scan
from buyers.models import Buyer
from .models import TicketPreProcessing
from .serializers import TicketPreProcessingSerializer


class TicketPreProcessingViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TicketPreProcessingSerializer

    @action(detail=False, methods=['get'])
    def lookup(self, request):
        """GET /api/ticket-preprocessing/lookup/?ticket_number=X"""
        scanned_ticket = request.query_params.get('ticket_number', '').strip()

        if not scanned_ticket:
            return Response(
                {'detail': 'Ticket number is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Scanner sends the full Code 39 barcode:
        # <base ticket number><Mod-43 check character>
        ticket_number, is_valid = split_and_validate_scan(scanned_ticket)

        if not is_valid:
            return Response(
                {'detail': 'Invalid ticket barcode.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        branch = user.branches[0] if user.branches else None

        bale = Bale.objects.filter(
            ticket_number=ticket_number,
            branch=branch
        ).select_related(
            'delivery_note__grower',
            'sale_date'
        ).first()

        if not bale:
            return Response(
                {'detail': 'Ticket not found in the system.'},
                status=status.HTTP_404_NOT_FOUND
            )

        existing = TicketPreProcessing.objects.filter(bale=bale).select_related('buyer').first()

        return Response({
            'bale_id': bale.id,
            'ticket_number': bale.ticket_number,
            'grower_name': f"{bale.delivery_note.grower.first_name} {bale.delivery_note.grower.last_name}",
            'grower_number': bale.delivery_note.grower.grower_number,
            'mass': bale.mass,
            'lot_number': bale.lot_number,
            'group_number': bale.group_number,
            'hessian_code': bale.hessian_code,
            'is_editable': bale.sale_date.is_open,
            'existing': TicketPreProcessingSerializer(existing).data if existing else None,
        })

    @action(detail=False, methods=['post'])
    def save(self, request):
        """POST /api/ticket-preprocessing/save/ — creates or updates the pre-processing record for a bale."""
        bale_id = request.data.get('bale')
        bale = Bale.objects.filter(pk=bale_id).select_related('sale_date').first()
        if not bale:
            return Response({'detail': 'Bale not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        branch = user.branches[0] if user.branches else None
        if bale.branch != branch:
            return Response({'detail': 'This ticket does not belong to your branch.'}, status=status.HTTP_400_BAD_REQUEST)

        if not bale.sale_date.is_open:
            return Response({'detail': "This ticket's sale date is closed and can no longer be edited."}, status=status.HTTP_400_BAD_REQUEST)

        if bale.sale_date.exchange_rate is None:
            return Response({'detail': 'Tickets cannot be processed until the exchange rate is captured for this sale date.'}, status=status.HTTP_400_BAD_REQUEST)

        instance = TicketPreProcessing.objects.filter(bale=bale).first()

        if instance:
            buyer = instance.buyer
        else:
            buyer = Buyer.objects.filter(is_current=True).first()
            if not buyer:
                return Response({'detail': 'No buyer is currently marked active. Set one in Settings first.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = TicketPreProcessingSerializer(
            instance, data=request.data, partial=bool(instance), context={'buyer': buyer}
        )
        serializer.is_valid(raise_exception=True)

        if instance:
            serializer.save()
        else:
            serializer.save(bale=bale, buyer=buyer, processed_by=user)

        return Response(TicketPreProcessingSerializer(serializer.instance).data)

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Pre-processed tickets for the currently open sale date at this branch."""
        user = request.user
        branch = user.branches[0] if user.branches else None
        search = request.query_params.get('search', '').strip()

        qs = TicketPreProcessing.objects.filter(
            bale__branch=branch, bale__sale_date__is_open=True
        ).select_related('bale__delivery_note__grower').order_by('-processed_at')

        if search:
            qs = qs.filter(
                dj_models.Q(bale__delivery_note__grower__first_name__icontains=search)
                | dj_models.Q(bale__delivery_note__grower__last_name__icontains=search)
                | dj_models.Q(bale__delivery_note__grower__grower_number__icontains=search)
            )

        return Response([
            {
                'id': tp.id,
                'ticket_number': tp.bale.ticket_number,
                'grower_number': tp.bale.delivery_note.grower.grower_number,
                'mass': tp.bale.mass,
                'timb_grade': tp.timb_grade,
                'buyer_grade': tp.buyer_grade,
                'price_per_kg': str(tp.price_per_kg),
            }
            for tp in qs
        ])