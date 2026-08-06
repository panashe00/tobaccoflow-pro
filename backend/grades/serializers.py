from rest_framework import serializers
from .models import TimbGrade


class TimbGradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimbGrade
        fields = ['id', 'code', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']