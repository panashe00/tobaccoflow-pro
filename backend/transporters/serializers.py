from rest_framework import serializers
from .models import Transporter


class TransporterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transporter
        fields = [
            'id', 'transporter_number', 'first_name', 'last_name',
            'address', 'bank_name', 'account_number',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']