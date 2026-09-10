from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from deliverynotes.models import DeliveryNote
from .models import GrowerDeduction
from .serializers import GrowerDeductionSerializer, PendingDeductionDeliveryNoteSerializer


class GrowerDeductionViewSet(viewsets.ModelViewSet):
    queryset = GrowerDeduction.objects.all()
    serializer_class = GrowerDeductionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        dn_id = self.request.query_params.get('delivery_note')
        if dn_id:
            qs = qs.filter(delivery_note_id=dn_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, is_transporter=False)

    @action(detail=False, methods=['post'])
    def add_transporter_deduction(self, request):
        dn_id = request.data.get('delivery_note')
        amount = request.data.get('amount')

        dn = DeliveryNote.objects.filter(pk=dn_id).first()
        if not dn:
            return Response({'detail': 'Delivery Note not found.'}, status=400)
        if not dn.transporter:
            return Response({'detail': 'This Delivery Note has no transporter.'}, status=400)
        if GrowerDeduction.objects.filter(delivery_note=dn, is_transporter=True).exists():
            return Response({'detail': 'Transporter deduction already added for this Delivery Note.'}, status=400)

        transporter_name = f"{dn.transporter.first_name} {dn.transporter.last_name}"
        deduction = GrowerDeduction.objects.create(
            delivery_note=dn,
            name=f"Transporter Cost — {transporter_name}",
            amount=amount,
            is_transporter=True,
            created_by=request.user,
        )
        return Response(GrowerDeductionSerializer(deduction).data, status=201)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """D-Notes ready for ad-hoc deduction capture: weighed, not yet completed, in the open sale date."""
        user = request.user
        branch = user.branches[0] if user.branches else None

        qs = (
            DeliveryNote.objects.filter(
                branch=branch, sale_date__is_open=True,
                status='weighed', deductions_completed_at__isnull=True,
            )
            .select_related('grower', 'transporter')
            .order_by('-created_at')
        )

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(grower__first_name__icontains=search)
                | Q(grower__last_name__icontains=search)
                | Q(grower__grower_number__icontains=search)
            )
            count = qs.count()
            results = PendingDeductionDeliveryNoteSerializer(qs, many=True).data
        else:
            count = qs.count()
            results = PendingDeductionDeliveryNoteSerializer(qs[:5], many=True).data

        return Response({'count': count, 'results': results})