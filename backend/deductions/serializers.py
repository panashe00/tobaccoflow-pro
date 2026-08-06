from rest_framework import serializers
from .models import DeductionRule


class DeductionRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeductionRule
        fields = [
            'id', 'name', 'calculation_type', 'rate',
            'currency_treatment', 'is_permanent', 'is_active', 'order',
        ]
        read_only_fields = ['id', 'is_permanent']