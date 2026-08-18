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
        return qs