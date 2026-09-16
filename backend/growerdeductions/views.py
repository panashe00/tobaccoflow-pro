from django.db.models import Q
from rest_framework import viewsets, status
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

    def _check_editable(self, dn):
        if not dn.sale_date.is_open:
            raise ValueError("This Delivery Note's sale date is closed and can no longer be edited.")

    def create(self, request, *args, **kwargs):
        dn_id = request.data.get('delivery_note')
        dn = DeliveryNote.objects.filter(pk=dn_id).select_related('sale_date').first()
        if not dn:
            return Response({'detail': 'Delivery Note not found.'}, status=404)
        try:
            self._check_editable(dn)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self._check_editable(instance.delivery_note)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, is_transporter=False)

    @action(detail=False, methods=['post'])
    def add_transporter_deduction(self, request):
        dn_id = request.data.get('delivery_note')
        amount = request.data.get('amount')

        dn = DeliveryNote.objects.filter(pk=dn_id).select_related('sale_date', 'transporter').first()
        if not dn:
            return Response({'detail': 'Delivery Note not found.'}, status=400)
        try:
            self._check_editable(dn)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
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
        """No search: default worklist (weighed, open sale date, not yet completed), capped at 5.
        With search: any D-Note that's reached weighing, across ALL sale dates — for viewing/
        correcting past entries — but editing stays locked to the currently open sale date
        (enforced above, in create/destroy/add_transporter_deduction)."""
        user = request.user
        branch = user.branches[0] if user.branches else None
        search = request.query_params.get('search')

        base_qs = (
            DeliveryNote.objects.filter(branch=branch, status__in=['weighed', 'verified'])
            .select_related('grower', 'transporter', 'sale_date')
        )

        if search:
            qs = base_qs.filter(
                Q(grower__first_name__icontains=search)
                | Q(grower__last_name__icontains=search)
                | Q(grower__grower_number__icontains=search)
            ).order_by('-created_at')
            count = qs.count()
            results = PendingDeductionDeliveryNoteSerializer(qs, many=True).data
        else:
            qs = base_qs.filter(
                sale_date__is_open=True, deductions_completed_at__isnull=True
            ).order_by('-created_at')
            count = qs.count()
            results = PendingDeductionDeliveryNoteSerializer(qs[:5], many=True).data

        return Response({'count': count, 'results': results})