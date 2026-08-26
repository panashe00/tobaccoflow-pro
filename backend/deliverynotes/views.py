from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from saledates.models import SaleDate
from .models import DeliveryNote
from .serializers import DeliveryNoteSerializer


class DeliveryNoteViewSet(viewsets.ModelViewSet):
    queryset = DeliveryNote.objects.select_related('grower', 'transporter', 'sale_date').all()
    serializer_class = DeliveryNoteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['dn_number', 'grower__first_name', 'grower__last_name', 'grower__grower_number']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.branches:
            qs = qs.filter(branch__in=user.branches)
        if not self.request.query_params.get('search'):
            qs = qs.filter(sale_date__is_open=True, status='pending')
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        branch = user.branches[0] if user.branches else None
        grower = serializer.validated_data['grower']

        sale_date = SaleDate.objects.filter(branch=branch, is_open=True).first()
        if sale_date:
            existing = DeliveryNote.objects.filter(sale_date=sale_date, grower=grower).first()
            if existing:
                return Response(
                    {
                        'conflict': True,
                        'detail': f"{grower.first_name} {grower.last_name} already has Delivery Note "
                                  f"{existing.dn_number} for this sale date.",
                        'existing_delivery_note': DeliveryNoteSerializer(existing).data,
                    },
                    status=status.HTTP_409_CONFLICT,
                )

        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'])
    def add_bales(self, request, pk=None):
        """POST /api/delivery-notes/{id}/add_bales/ — merges extra bales into an existing D-Note."""
        delivery_note = self.get_object()
        additional = request.data.get('number_of_bales')
        try:
            additional = int(additional)
        except (TypeError, ValueError):
            additional = 0
        if additional <= 0:
            return Response({'detail': 'number_of_bales must be a positive integer.'}, status=status.HTTP_400_BAD_REQUEST)

        delivery_note.number_of_bales += additional
        delivery_note.save(update_fields=['number_of_bales'])
        return Response(DeliveryNoteSerializer(delivery_note).data)