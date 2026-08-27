from django.db import transaction
from rest_framework import serializers
from deliverynotes.models import DeliveryNote
from saledates.models import SaleDate
from .models import Scale, HessianCode, TicketBook, Bale


class ScaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scale
        fields = ['id', 'name', 'branch', 'is_active']


class HessianCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = HessianCode
        fields = ['id', 'code', 'is_active']


class TicketBookSerializer(serializers.ModelSerializer):
    remaining = serializers.SerializerMethodField()

    class Meta:
        model = TicketBook
        fields = ['id', 'branch', 'start_number', 'end_number', 'next_number', 'is_active', 'remaining']
        read_only_fields = ['id', 'next_number']

    def get_remaining(self, obj):
        return max(obj.end_number - obj.next_number + 1, 0)


class WeighingDeliveryNoteSerializer(serializers.ModelSerializer):
    grower_name = serializers.SerializerMethodField()
    grower_number = serializers.SerializerMethodField()
    transporter_name = serializers.SerializerMethodField()
    bales_captured = serializers.IntegerField(read_only=True)

    class Meta:
        model = DeliveryNote
        fields = [
            'id', 'dn_number', 'grower_name', 'grower_number', 'transporter_name',
            'branch', 'number_of_bales', 'bales_captured', 'date_received', 'status',
        ]

    def get_grower_name(self, obj):
        return f"{obj.grower.first_name} {obj.grower.last_name}"

    def get_grower_number(self, obj):
        return obj.grower.grower_number

    def get_transporter_name(self, obj):
        return f"{obj.transporter.first_name} {obj.transporter.last_name}" if obj.transporter else None


class BaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bale
        fields = [
            'id', 'delivery_note', 'group_number', 'lot_number', 'hessian_code',
            'mass', 'ticket_number', 'scale', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_hessian_code(self, value):
        if not HessianCode.objects.filter(code__iexact=value, is_active=True).exists():
            raise serializers.ValidationError("Invalid or inactive hessian code.")
        return value.upper()

    def create(self, validated_data):
        request = self.context['request']
        user = request.user
        branch = user.branches[0] if user.branches else None
        delivery_note = validated_data['delivery_note']

        if delivery_note.branch != branch:
            raise serializers.ValidationError("This Delivery Note does not belong to your branch.")

        with transaction.atomic():
            dn = DeliveryNote.objects.select_for_update().get(pk=delivery_note.pk)

            existing_count = Bale.objects.filter(delivery_note=dn).count()
            if existing_count >= dn.number_of_bales:
                raise serializers.ValidationError(
                    f"All {dn.number_of_bales} bales for {dn.dn_number} have already been captured."
                )

            if Bale.objects.filter(delivery_note=dn, lot_number=validated_data['lot_number']).exists():
                raise serializers.ValidationError(
                    f"Lot number {validated_data['lot_number']} has already been used for this Delivery Note."
                )

            ticket_book = TicketBook.objects.select_for_update().filter(branch=branch, is_active=True).first()
            if not ticket_book:
                raise serializers.ValidationError("No active ticket book found for your branch.")

            ticket_number = validated_data['ticket_number']
            if ticket_number != ticket_book.next_number:
                raise serializers.ValidationError(
                    f"Ticket number out of sequence. Expected {ticket_book.next_number}."
                )
            if ticket_number > ticket_book.end_number:
                raise serializers.ValidationError("This ticket book has been fully used. Register a new one.")

            sale_date = SaleDate.objects.filter(branch=branch, is_open=True).first()
            if not sale_date:
                raise serializers.ValidationError("No sale date is currently open for your branch.")

            bale = Bale.objects.create(
                sale_date=sale_date, branch=branch, captured_by=user, **validated_data,
            )

            ticket_book.next_number += 1
            ticket_book.save(update_fields=['next_number'])

            if dn.status == 'pending':
                dn.status = 'weighed'
                dn.save(update_fields=['status'])

        return bale