from rest_framework import serializers
from buyers.models import BuyerGrade
from .models import BaleProcessing


class BaleProcessingSerializer(serializers.ModelSerializer):
    class Meta:
        model = BaleProcessing
        fields = [
            'id',
            'bale',
            'buyer_grade',
            'price_per_kg',
            'grade_mismatch',
            'price_mismatch',
            'processed_at',
        ]
        read_only_fields = [
            'id',
            'grade_mismatch',
            'price_mismatch',
            'processed_at',
        ]

    def validate_buyer_grade(self, value):
        buyer = self.context.get('buyer')

        if buyer and not BuyerGrade.objects.filter(
            buyer=buyer,
            code__iexact=value,
            is_active=True
        ).exists():
            raise serializers.ValidationError(
                f"'{value}' is not a valid grade for {buyer.name}."
            )

        return value.upper()