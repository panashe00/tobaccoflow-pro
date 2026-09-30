from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from weighing.models import Bale
from weighing.barcodes import split_and_validate_scan
from users.permissions import IsAdminOrReadOnly
from .models import RejectionCode, RejectedBale
from .serializers import RejectionCodeSerializer, RejectedBaleSerializer


class RejectionCodeViewSet(viewsets.ModelViewSet):
    queryset = RejectionCode.objects.all()
    serializer_class = RejectionCodeSerializer
    permission_classes = [IsAdminOrReadOnly]


class RejectedBaleViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = RejectedBaleSerializer

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

        if hasattr(bale, 'rejection'):
            return Response({'detail': 'This bale has already been rejected.'}, status=status.HTTP_400_BAD_REQUEST)

        if hasattr(bale, 'dispatch_item'):
            return Response({'detail': 'This bale has already been dispatched and cannot be rejected.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'bale_id': bale.id,
            'ticket_number': bale.ticket_number,
            'grower_name': f"{bale.delivery_note.grower.first_name} {bale.delivery_note.grower.last_name}",
            'grower_number': bale.delivery_note.grower.grower_number,
            'mass': bale.mass,
            'lot_number': bale.lot_number,
            'hessian_code': bale.hessian_code,
        })

    @action(detail=False, methods=['post'])
    def reject(self, request):
        bale_id = request.data.get('bale')
        rejection_code_id = request.data.get('rejection_code')

        bale = Bale.objects.filter(pk=bale_id).select_related('delivery_note').first()
        if not bale:
            return Response({'detail': 'Bale not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        branch = user.branches[0] if user.branches else None
        if bale.branch != branch:
            return Response({'detail': 'This ticket does not belong to your branch.'}, status=status.HTTP_400_BAD_REQUEST)

        if hasattr(bale, 'rejection'):
            return Response({'detail': 'This bale has already been rejected.'}, status=status.HTTP_400_BAD_REQUEST)
        if hasattr(bale, 'dispatch_item'):
            return Response({'detail': 'This bale has already been dispatched and cannot be rejected.'}, status=status.HTTP_400_BAD_REQUEST)

        code = RejectionCode.objects.filter(pk=rejection_code_id, is_active=True).first()
        if not code:
            return Response({'detail': 'Invalid or inactive rejection code.'}, status=status.HTTP_400_BAD_REQUEST)

        rejected = RejectedBale.objects.create(bale=bale, rejection_code=code, rejected_by=user)
        return Response(RejectedBaleSerializer(rejected).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def today(self, request):
        user = request.user
        branch = user.branches[0] if user.branches else None
        qs = RejectedBale.objects.filter(bale__branch=branch, bale__sale_date__is_open=True).select_related(
            'bale__delivery_note__grower', 'rejection_code'
        )
        return Response(RejectedBaleSerializer(qs, many=True).data)