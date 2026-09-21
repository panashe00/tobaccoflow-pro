from rest_framework import serializers
from grades.models import TimbGrade
from buyers.models import BuyerGrade
from .models import TicketPreProcessing


class TicketPreProcessingSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketPreProcessing
        fields = ['id', 'bale', 'timb_grade', 'buyer', 'buyer_grade', 'price_per_kg', 'processed_at', 'updated_at']
        read_only_fields = ['id', 'bale', 'buyer', 'processed_at', 'updated_at']

    def validate_timb_grade(self, value):
        if not TimbGrade.objects.filter(code__iexact=value, is_active=True).exists():
            raise serializers.ValidationError(f"'{value}' is not a valid TIMB grade.")
        return value.upper()

    def validate_buyer_grade(self, value):
        buyer = self.instance.buyer if self.instance else self.context.get('buyer')
        if not buyer:
            raise serializers.ValidationError("No buyer context available to validate this grade.")
        if not BuyerGrade.objects.filter(buyer=buyer, code__iexact=value, is_active=True).exists():
            raise serializers.ValidationError(f"'{value}' is not a valid grade for {buyer.name}.")
        return value.upper()