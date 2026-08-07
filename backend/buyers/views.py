from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsAdminOrReadOnly
from .models import Buyer, BuyerGrade
from .serializers import BuyerSerializer, BuyerGradeSerializer


class BuyerViewSet(viewsets.ModelViewSet):
    queryset = Buyer.objects.all().prefetch_related('grades')
    serializer_class = BuyerSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'code']

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def current(self, request):
        """GET /api/buyers/current/ — the buyer whose grades apply right now."""
        buyer = Buyer.objects.filter(is_current=True).prefetch_related('grades').first()
        if not buyer:
            return Response(None)
        return Response(BuyerSerializer(buyer).data)

    @action(detail=True, methods=['post'])
    def set_current(self, request, pk=None):
        """POST /api/buyers/{id}/set_current/ — makes this the sole active buyer."""
        Buyer.objects.filter(is_current=True).update(is_current=False)
        buyer = self.get_object()
        buyer.is_current = True
        buyer.save(update_fields=['is_current'])
        return Response(BuyerSerializer(buyer).data)

class BuyerGradeViewSet(viewsets.ModelViewSet):
    serializer_class = BuyerGradeSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = BuyerGrade.objects.all()
        buyer_id = self.request.query_params.get('buyer')
        if buyer_id:
            qs = qs.filter(buyer_id=buyer_id)
        return qs