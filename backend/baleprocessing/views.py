from decimal import Decimal
from django.db import models as dj_models
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from weighing.models import Bale
from weighing.barcodes import split_and_validate_scan
from ticketprocessing.models import TicketPreProcessing
from deliverynotes.models import DeliveryNote
from .models import BaleProcessing
from .serializers import BaleProcessingSerializer


class BaleProcessingViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BaleProcessingSerializer

    @action(detail=False, methods=['get'])
    def lookup(self, request):
        """GET /api/bale-processing/lookup/?ticket_number=X — blind lookup, no pre-processing values revealed."""
        scanned = request.query_params.get('ticket_number', '').strip()
        if not scanned:
            return Response({'detail': 'Ticket number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        ticket_number, is_valid = split_and_validate_scan(scanned)
        if not is_valid:
            return Response({'detail': 'Invalid ticket barcode.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        branch = user.branches[0] if user.branches else None

        bale = Bale.objects.filter(ticket_number=ticket_number, branch=branch).select_related(
            'delivery_note__grower', 'sale_date'
        ).first()
        if not bale:
            return Response({'detail': 'Ticket not found in the system.'}, status=status.HTTP_404_NOT_FOUND)

        pre = TicketPreProcessing.objects.filter(bale=bale).select_related('buyer').first()
        if not pre:
            return Response(
                {'detail': 'This ticket has not been pre-processed yet.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if pre.processed_by_id == user.id:
            return Response(
                {'detail': 'You captured this ticket during Ticket Pre-Processing and cannot also perform Bale Processing on it.'},
                status=status.HTTP_403_FORBIDDEN
            )

        existing = BaleProcessing.objects.filter(bale=bale).first()

        return Response({
            'bale_id': bale.id,
            'ticket_number': bale.ticket_number,
            'grower_name': f"{bale.delivery_note.grower.first_name} {bale.delivery_note.grower.last_name}",
            'grower_number': bale.delivery_note.grower.grower_number,
            'mass': bale.mass,
            'lot_number': bale.lot_number,
            'hessian_code': bale.hessian_code,
            'is_editable': bale.sale_date.is_open,
            'already_processed': existing is not None,
            'existing': BaleProcessingSerializer(existing).data if existing else None,
        })

    @action(detail=False, methods=['post'])
    def save(self, request):
        bale_id = request.data.get('bale')
        bale = Bale.objects.filter(pk=bale_id).select_related('sale_date', 'delivery_note').first()
        if not bale:
            return Response({'detail': 'Bale not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        branch = user.branches[0] if user.branches else None
        if bale.branch != branch:
            return Response({'detail': 'This ticket does not belong to your branch.'}, status=status.HTTP_400_BAD_REQUEST)

        if not bale.sale_date.is_open:
            return Response({'detail': "This ticket's sale date is closed and can no longer be edited."}, status=status.HTTP_400_BAD_REQUEST)

        pre = TicketPreProcessing.objects.filter(bale=bale).select_related('buyer').first()
        if not pre:
            return Response({'detail': 'This ticket has not been pre-processed yet.'}, status=status.HTTP_400_BAD_REQUEST)

        if pre.processed_by_id == user.id:
            return Response(
                {'detail': 'You captured this ticket during Ticket Pre-Processing and cannot also perform Bale Processing on it.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if BaleProcessing.objects.filter(bale=bale).exists():
            return Response({'detail': 'This ticket has already been processed.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = BaleProcessingSerializer(data=request.data, context={'buyer': pre.buyer})
        serializer.is_valid(raise_exception=True)

        buyer_grade = serializer.validated_data['buyer_grade']
        price_per_kg = serializer.validated_data['price_per_kg']

        grade_mismatch = buyer_grade.upper() != pre.buyer_grade.upper()
        price_mismatch = Decimal(price_per_kg) != Decimal(pre.price_per_kg)

        processing = BaleProcessing.objects.create(
            bale=bale, buyer_grade=buyer_grade, price_per_kg=price_per_kg,
            grade_mismatch=grade_mismatch, price_mismatch=price_mismatch,
            processed_by=user,
        )

        dn = bale.delivery_note
        total_bales = dn.number_of_bales
        processed_count = BaleProcessing.objects.filter(bale__delivery_note=dn).count()
        if processed_count >= total_bales and dn.status != 'verified':
            dn.status = 'verified'
            dn.save(update_fields=['status'])

        return Response({
            **BaleProcessingSerializer(processing).data,
            'pre_processing': {
                'buyer_grade': pre.buyer_grade,
                'price_per_kg': str(pre.price_per_kg),
            },
        })

    @action(detail=False, methods=['get'])
    def today(self, request):
        user = request.user
        branch = user.branches[0] if user.branches else None
        search = request.query_params.get('search', '').strip()

        qs = BaleProcessing.objects.filter(
            bale__branch=branch, bale__sale_date__is_open=True
        ).select_related('bale__delivery_note__grower', 'bale__pre_processing').order_by('-processed_at')

        if search:
            qs = qs.filter(
                dj_models.Q(bale__delivery_note__grower__first_name__icontains=search)
                | dj_models.Q(bale__delivery_note__grower__last_name__icontains=search)
                | dj_models.Q(bale__delivery_note__grower__grower_number__icontains=search)
            )

        results = []
        for bp in qs:
            pre = getattr(bp.bale, 'pre_processing', None)
            results.append({
                'id': bp.id,
                'ticket_number': bp.bale.ticket_number,
                'grower_number': bp.bale.delivery_note.grower.grower_number,
                'pre_grade': pre.buyer_grade if pre else None,
                'final_grade': bp.buyer_grade,
                'pre_price': str(pre.price_per_kg) if pre else None,
                'final_price': str(bp.price_per_kg),
                'has_mismatch': bp.has_mismatch,
            })
        return Response(results)

    @action(detail=False, methods=['get'])
    def mismatches(self, request):
        dn_id = request.query_params.get('delivery_note')
        qs = BaleProcessing.objects.filter(bale__delivery_note_id=dn_id).filter(
            dj_models.Q(grade_mismatch=True) | dj_models.Q(price_mismatch=True)
        ).select_related('bale')
        return Response([
            {
                'id': bp.id,
                'lot_number': bp.bale.lot_number,
                'ticket_number': bp.bale.ticket_number,
                'buyer_grade': bp.buyer_grade,
                'price_per_kg': str(bp.price_per_kg),
                'grade_mismatch': bp.grade_mismatch,
                'price_mismatch': bp.price_mismatch,
                'resolved_buyer_grade': bp.resolved_buyer_grade,
                'resolved_price_per_kg': str(bp.resolved_price_per_kg) if bp.resolved_price_per_kg is not None else None,
                'is_resolved': bp.is_resolved,
            }
            for bp in qs
        ])

    @action(detail=False, methods=['post'], url_path='resolve-mismatch')
    def resolve_mismatch(self, request):
        bp = BaleProcessing.objects.filter(pk=request.data.get('id')).select_related('bale').first()
        if not bp:
            return Response({'detail': 'Record not found.'}, status=404)

        user = request.user
        branch = user.branches[0] if user.branches else None
        if bp.bale.branch != branch:
            return Response({'detail': 'This ticket does not belong to your branch.'}, status=400)

        bp.resolved_buyer_grade = (request.data.get('buyer_grade') or '').upper() or None
        bp.resolved_price_per_kg = request.data.get('price_per_kg')
        bp.resolved_by = user
        bp.resolved_at = timezone.now()
        bp.save(update_fields=['resolved_buyer_grade', 'resolved_price_per_kg', 'resolved_by', 'resolved_at'])
        return Response({
            'id': bp.id,
            'resolved_buyer_grade': bp.resolved_buyer_grade,
            'resolved_price_per_kg': str(bp.resolved_price_per_kg),
        })