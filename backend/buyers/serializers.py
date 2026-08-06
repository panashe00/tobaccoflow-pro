from rest_framework import serializers
from .models import Buyer, BuyerGrade


class BuyerGradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerGrade
        fields = ['id', 'code', 'is_active']


class BuyerSerializer(serializers.ModelSerializer):
    grades = serializers.ListField(child=serializers.CharField(max_length=8), write_only=True, required=False)
    grade_list = serializers.SerializerMethodField()

    class Meta:
        model = Buyer
        fields = [
            'id', 'name', 'code', 'contact_person', 'contact', 'email',
            'is_active', 'is_current', 'grades', 'grade_list',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'is_current', 'created_at', 'updated_at']

    def get_grade_list(self, obj):
        return [g.code for g in obj.grades.all()]

    def create(self, validated_data):
        grade_codes = validated_data.pop('grades', [])
        buyer = Buyer.objects.create(**validated_data)
        self._sync_grades(buyer, grade_codes)
        return buyer

    def update(self, instance, validated_data):
        grade_codes = validated_data.pop('grades', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if grade_codes is not None:
            self._sync_grades(instance, grade_codes)
        return instance

    def _sync_grades(self, buyer, codes):
        codes = {c.strip() for c in codes if c.strip()}
        existing = {g.code: g for g in buyer.grades.all()}
        for code, obj in existing.items():
            if code not in codes:
                obj.delete()
        for code in codes:
            if code not in existing:
                BuyerGrade.objects.create(buyer=buyer, code=code)