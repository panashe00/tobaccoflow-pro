from rest_framework import serializers
from .models import Salesheet, SalesheetDeductionLine, SalesheetBaleLine


class SalesheetBaleLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesheetBaleLine
        fields = ['id', 'bale', 'group_number', 'lot_number', 'mass', 'buyer_grade', 'price_per_kg', 'value', 'is_rejected', 'rejection_description']


class SalesheetDeductionLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesheetDeductionLine
        fields = '__all__'


class SalesheetSerializer(serializers.ModelSerializer):
    deduction_lines = SalesheetDeductionLineSerializer(many=True, read_only=True)
    bale_lines = SalesheetBaleLineSerializer(many=True, read_only=True)
    grower_name = serializers.SerializerMethodField()
    grower_number = serializers.SerializerMethodField()
    national_id = serializers.CharField(source='grower.national_id', read_only=True)
    sale_date_display = serializers.DateField(source='sale_date.date', read_only=True)
    dn_number = serializers.CharField(source='delivery_note.dn_number', read_only=True)
    is_editable = serializers.BooleanField(source='sale_date.is_open', read_only=True)

    class Meta:
        model = Salesheet
        fields = [
            'id', 'reference_number', 'delivery_note', 'dn_number', 'grower', 'grower_name', 'grower_number',
            'national_id', 'branch', 'sale_date', 'sale_date_display', 'exchange_rate',
            'usd_split_percent', 'total_mass', 'gross_value', 'statutory_deductions_total',
            'farmer_deductions_total', 'total_deductions', 'net_value', 'usd_portion', 'zig_portion',
            'bales_incomplete', 'deduction_lines', 'bale_lines', 'generated_at', 'recalculated_at', 'is_editable',
        ]
        read_only_fields = fields

    def get_grower_name(self, obj):
        return f"{obj.grower.first_name} {obj.grower.last_name}"

    def get_grower_number(self, obj):
        return obj.grower.grower_number