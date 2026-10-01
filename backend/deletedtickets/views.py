from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from weighing.models import Bale
from weighing.barcodes import split_and_validate_scan
from .models import DeletedTicketLog
from .serializers import DeletedTicketLogSerializer


def _recompute_dn_status(dn):
    """After a deletion, the D-Note's status may no longer reflect reality —
    re-derive it from what bales actually remain."""
    remaining = Bale.objects.filter(delivery_note=dn)
    count = remaining.count()
    if count == 0:
        new_status = 'pending'
    elif remaining.filter(processing__isnull=False).count() == count:
        new_status = 'verified'
    else:
        new_status = 'weighed'
    if dn.status != new_status:
        dn.status = new_status
        dn.save(update_fields=['status'])


class DeletedTicketViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = DeletedTicketLogSerializer

    @action(detail=False, methods=['get'])
    def lookup(self, request):
        scanned = request.query_params.get('ticket_number', '').strip()
        ticket_number, is_valid = split_and_validate_scan(scanned)
        if not is_valid:
            return Response({'detail': 'Invalid ticket barcode.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        branch = user.branches[0] if user.branches else None
        bale = Bale.objects.filter(ticket_number=ticket_number, branch=branch).select_related(
            'delivery_note__grower'
        ).first()
        if not bale:
            return Response({'detail': 'Ticket not found in the system.'}, status=status.HTTP_404_NOT_FOUND)

        if hasattr(bale, 'dispatch_item'):
            return Response({'detail': 'This ticket has already been dispatched and cannot be deleted.'}, status=status.HTTP_400_BAD_REQUEST)
        if hasattr(bale, 'rejection'):
            return Response({'detail': 'This ticket has already been rejected and cannot be deleted.'}, status=status.HTTP_400_BAD_REQUEST)
        if hasattr(bale.delivery_note, 'salesheet'):
            return Response({'detail': 'A salesheet has already been generated for this Delivery Note. This ticket cannot be deleted.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'bale_id': bale.id,
            'ticket_number': bale.ticket_number,
            'delivery_note': bale.delivery_note.id,
            'dn_number': bale.delivery_note.dn_number,
            'grower_name': f"{bale.delivery_note.grower.first_name} {bale.delivery_note.grower.last_name}",
            'grower_number': bale.delivery_note.grower.grower_number,
            'group_number': bale.group_number,
            'lot_number': bale.lot_number,
            'hessian_code': bale.hessian_code,
            'mass': bale.mass,
        })

    @action(detail=False, methods=['post'])
    def delete_ticket(self, request):
        bale_id = request.data.get('bale')
        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({'detail': 'A reason is required.'}, status=status.HTTP_400_BAD_REQUEST)

        bale = Bale.objects.filter(pk=bale_id).select_related('delivery_note').first()
        if not bale:
            return Response({'detail': 'Bale not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        branch = user.branches[0] if user.branches else None
        if bale.branch != branch:
            return Response({'detail': 'This ticket does not belong to your branch.'}, status=status.HTTP_400_BAD_REQUEST)

        if hasattr(bale, 'dispatch_item'):
            return Response({'detail': 'This ticket has already been dispatched and cannot be deleted.'}, status=status.HTTP_400_BAD_REQUEST)
        if hasattr(bale, 'rejection'):
            return Response({'detail': 'This ticket has already been rejected and cannot be deleted.'}, status=status.HTTP_400_BAD_REQUEST)
        if hasattr(bale.delivery_note, 'salesheet'):
            return Response({'detail': 'A salesheet has already been generated for this Delivery Note. This ticket cannot be deleted.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            dn = bale.delivery_note
            log = DeletedTicketLog.objects.create(
                delivery_note=dn, branch=bale.branch, ticket_number=bale.ticket_number,
                group_number=bale.group_number, lot_number=bale.lot_number,
                hessian_code=bale.hessian_code, mass=bale.mass,
                reason=reason, deleted_by=user,
            )
            bale.delete()
            _recompute_dn_status(dn)

        return Response(DeletedTicketLogSerializer(log).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def today(self, request):
        user = request.user
        branch = user.branches[0] if user.branches else None
        qs = DeletedTicketLog.objects.filter(
            branch=branch, delivery_note__sale_date__is_open=True
        ).select_related('delivery_note__grower')
        return Response(DeletedTicketLogSerializer(qs, many=True).data)