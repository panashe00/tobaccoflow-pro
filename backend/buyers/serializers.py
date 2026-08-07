from rest_framework import serializers
from .models import Buyer, BuyerGrade


class BuyerGradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerGrade
        fields = ['id', 'buyer', 'code', 'is_active']


class BuyerSerializer(serializers.ModelSerializer):
    grade_count = serializers.SerializerMethodField()

    class Meta:
        model = Buyer
        fields = [
            'id', 'name', 'code', 'contact_person', 'contact', 'email',
            'is_active', 'is_current', 'grade_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'is_current', 'created_at', 'updated_at']

    def get_grade_count(self, obj):
        return obj.grades.count()