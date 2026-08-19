from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
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

        # Only apply the "current sale date + pending" default when not searching.
        # A search should surface matches across all sale dates and statuses.
        search = self.request.query_params.get('search')
        if not search:
            qs = qs.filter(sale_date__is_open=True, status='pending')

        return qs