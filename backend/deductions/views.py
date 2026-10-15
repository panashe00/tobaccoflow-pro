from rest_framework import viewsets
from users.permissions import IsSuperAdminOrReadOnly
from .models import DeductionRule
from .serializers import DeductionRuleSerializer


class DeductionRuleViewSet(viewsets.ModelViewSet):
    queryset = DeductionRule.objects.all()
    serializer_class = DeductionRuleSerializer
    permission_classes = [IsSuperAdminOrReadOnly]