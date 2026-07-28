from rest_framework import serializers
from .models import Grower


class GrowerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grower
        fields = [
            'id', 'grower_number', 'first_name', 'last_name',
            'national_id', 'contact', 'address',
            'bank_name', 'account_number',
            'branch', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']