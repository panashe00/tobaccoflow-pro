from rest_framework import viewsets, filters
from users.permissions import IsAdminOrReadOnly
from .models import Grower
from .serializers import GrowerSerializer


class GrowerViewSet(viewsets.ModelViewSet):
    queryset = Grower.objects.all()
    serializer_class = GrowerSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['grower_number', 'first_name', 'last_name', 'national_id']