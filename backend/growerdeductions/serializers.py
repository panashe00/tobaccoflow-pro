from rest_framework import serializers
from deliverynotes.models import DeliveryNote
from .models import GrowerDeduction


class GrowerDeductionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GrowerDeduction
        fields = ['id', 'delivery_note', 'name', 'amount', 'note', 'is_transporter', 'created_at']
        read_only_fields = ['id', 'is_transporter', 'created_at']


class PendingDeductionDeliveryNoteSerializer(serializers.ModelSerializer):
    grower_name = serializers.SerializerMethodField()
    grower_number = serializers.SerializerMethodField()
    transporter_id = serializers.IntegerField(source='transporter.id', read_only=True, default=None)
    transporter_name = serializers.SerializerMethodField()
    requires_transporter_deduction = serializers.SerializerMethodField()
    deduction_count = serializers.SerializerMethodField()
    sale_date_display = serializers.DateField(source='sale_date.date', read_only=True)
    is_editable = serializers.BooleanField(source='sale_date.is_open', read_only=True)
    deductions_completed = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryNote
        fields = [
            'id', 'dn_number', 'grower_name', 'grower_number',
            'transporter_id', 'transporter_name', 'requires_transporter_deduction',
            'branch', 'number_of_bales', 'date_received', 'deduction_count',
            'sale_date_display', 'is_editable', 'deductions_completed',
        ]

    def get_grower_name(self, obj):
        return f"{obj.grower.first_name} {obj.grower.last_name}"

    def get_grower_number(self, obj):
        return obj.grower.grower_number

    def get_transporter_name(self, obj):
        return f"{obj.transporter.first_name} {obj.transporter.last_name}" if obj.transporter else None

    def get_requires_transporter_deduction(self, obj):
        return bool(obj.transporter) and not obj.grower_deductions.filter(is_transporter=True).exists()

    def get_deduction_count(self, obj):
        return obj.grower_deductions.count()

    def get_deductions_completed(self, obj):
        return obj.deductions_completed_at is not None