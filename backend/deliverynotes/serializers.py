from django.db import transaction
from rest_framework import serializers
from saledates.models import SaleDate
from .models import DeliveryNote, BranchCounter, BRANCH_CODES


class DeliveryNoteSerializer(serializers.ModelSerializer):
    grower_name = serializers.SerializerMethodField()
    grower_number = serializers.SerializerMethodField()
    transporter_name = serializers.SerializerMethodField()
    sale_date_display = serializers.DateField(source='sale_date.date', read_only=True)

    class Meta:
        model = DeliveryNote
        fields = [
            'id', 'dn_number', 'sale_date', 'sale_date_display', 'date_received',
            'grower', 'grower_name', 'grower_number',
            'transporter', 'transporter_name',
            'branch', 'number_of_bales', 'remarks', 'status',
            'created_by', 'created_at',
        ]
        read_only_fields = [
            'id', 'dn_number', 'sale_date', 'sale_date_display', 'branch',
            'status', 'created_by', 'created_at',
        ]

    def get_grower_name(self, obj):
        return f"{obj.grower.first_name} {obj.grower.last_name}"

    def get_grower_number(self, obj):
        return obj.grower.grower_number

    def get_transporter_name(self, obj):
        if obj.transporter:
            return f"{obj.transporter.first_name} {obj.transporter.last_name}"
        return None

    def create(self, validated_data):
        request = self.context['request']
        user = request.user

        if not user.branches:
            raise serializers.ValidationError("You have no branch assigned. Contact an admin.")
        branch = user.branches[0]

        sale_date = SaleDate.objects.filter(branch=branch, is_open=True).first()
        if not sale_date:
            raise serializers.ValidationError(f"No sale date is currently open for {branch}. Ask an admin to open one.")

        with transaction.atomic():
            counter, _ = BranchCounter.objects.select_for_update().get_or_create(branch=branch)
            counter.last_number += 1
            counter.save(update_fields=['last_number'])
            code = BRANCH_CODES.get(branch, branch[:3].upper())
            dn_number = f"DN-{code}-{counter.last_number:06d}"

            delivery_note = DeliveryNote.objects.create(
                dn_number=dn_number,
                sale_date=sale_date,
                branch=branch,
                created_by=user,
                **validated_data,
            )
        return delivery_note