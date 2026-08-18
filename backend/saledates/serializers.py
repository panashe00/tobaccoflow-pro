from rest_framework import serializers
from .models import SaleDate


class SaleDateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleDate
        fields = ['id', 'date', 'exchange_rate', 'is_open', 'opened_at', 'closed_at']
        read_only_fields = fields