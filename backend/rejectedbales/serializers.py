from rest_framework import serializers
from .models import RejectionCode, RejectedBale


class RejectionCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RejectionCode
        fields = ['id', 'code', 'description', 'is_active']


class RejectedBaleSerializer(serializers.ModelSerializer):
    ticket_number = serializers.CharField(source='bale.ticket_number', read_only=True)
    grower_number = serializers.CharField(source='bale.delivery_note.grower.grower_number', read_only=True)
    rejection_code_display = serializers.CharField(source='rejection_code.code', read_only=True)
    rejection_description = serializers.CharField(source='rejection_code.description', read_only=True)

    class Meta:
        model = RejectedBale
        fields = [
            'id', 'bale', 'ticket_number', 'grower_number',
            'rejection_code', 'rejection_code_display', 'rejection_description', 'rejected_at',
        ]
        read_only_fields = fields