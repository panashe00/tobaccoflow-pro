from rest_framework import viewsets, filters
from users.permissions import module_or_readonly
from .models import Grower
from .serializers import GrowerSerializer
from rest_framework.decorators import action
from rest_framework.response import Response


class GrowerViewSet(viewsets.ModelViewSet):
    queryset = Grower.objects.all()
    serializer_class = GrowerSerializer
    permission_classes = [module_or_readonly('growers')]
    filter_backends = [filters.SearchFilter]
    search_fields = ['grower_number', 'first_name', 'last_name', 'national_id']

    @action(detail=False, methods=['get'])
    def lookup(self, request):
        number = request.query_params.get('number', '').strip()
        grower = Grower.objects.filter(grower_number__iexact=number, is_active=True).first()
        if not grower:
            return Response(None)
        return Response(GrowerSerializer(grower).data)