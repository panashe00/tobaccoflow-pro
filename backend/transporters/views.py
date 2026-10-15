from rest_framework import viewsets, filters
from users.permissions import module_or_readonly
from .models import Transporter
from .serializers import TransporterSerializer


class TransporterViewSet(viewsets.ModelViewSet):
    queryset = Transporter.objects.all()
    serializer_class = TransporterSerializer
    permission_classes = [module_or_readonly('transporters')]
    filter_backends = [filters.SearchFilter]
    search_fields = ['transporter_number', 'first_name', 'last_name']