from django.db import transaction
from rest_framework import serializers
from deliverynotes.models import DeliveryNote
from saledates.models import SaleDate
from .models import Scale, HessianCode, TicketBook, Bale
from .barcodes import split_and_validate_scan, calculate_mod43_check_char

class ScaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scale
        fields = ['id', 'name', 'branch', 'is_active']
        read_only_fields = ['id', 'branch']


class HessianCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = HessianCode
        fields = ['id', 'code', 'is_active']


class TicketBookSerializer(serializers.ModelSerializer):
    remaining = serializers.SerializerMethodField()

    class Meta:
        model = TicketBook
        fields = ['id', 'branch', 'start_number', 'end_number', 'next_number', 'is_active', 'remaining']
        read_only_fields = ['id', 'branch', 'next_number', 'remaining']

    def get_remaining(self, obj):
        return max(int(obj.end_number) - int(obj.next_number) + 1, 0)

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
    barcode = serializers.CharField(write_only=True, help_text="Raw scanned value, including the Code 39 check character.")
    confirm_skip = serializers.BooleanField(write_only=True, required=False, default=False)
    ticket_number = serializers.CharField(read_only=True)

    class Meta:
        model = Bale
        fields = [
            'id', 'delivery_note', 'group_number', 'lot_number', 'hessian_code',
            'mass', 'barcode', 'confirm_skip', 'ticket_number', 'scale', 'created_at',
        ]
        read_only_fields = ['id', 'ticket_number', 'created_at']

    def validate_hessian_code(self, value):
        if not HessianCode.objects.filter(code__iexact=value, is_active=True).exists():
            raise serializers.ValidationError("Invalid or inactive hessian code.")
        return value.upper()

    def validate_mass(self, value):
        if value < 20 or value > 120:
            raise serializers.ValidationError("Bale mass must be between 20 kg and 120 kg.")
        return value

    def create(self, validated_data):
        request = self.context['request']
        user = request.user
        branch = user.branches[0] if user.branches else None
        delivery_note = validated_data['delivery_note']
        raw_scan = validated_data.pop('barcode')
        confirm_skip = validated_data.pop('confirm_skip', False)

        if delivery_note.branch != branch:
            raise serializers.ValidationError("This Delivery Note does not belong to your branch.")

        base_number, is_valid = split_and_validate_scan(raw_scan)
        if not is_valid:
            base_for_check = raw_scan[:-1] if len(raw_scan) >= 2 else raw_scan
            try:
                expected_char = calculate_mod43_check_char(base_for_check)
                hint = f" Expected check character '{expected_char}' for base '{base_for_check}'."
            except ValueError:
                hint = ""
            raise serializers.ValidationError(
                f"Invalid barcode — checksum failed.{hint} Please verify against the physical ticket and rescan."
            )

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

            width = len(ticket_book.start_number)
            base_padded = base_number.zfill(width) if len(base_number) <= width else base_number

            if Bale.objects.filter(ticket_number=base_padded).exists():
                raise serializers.ValidationError(f"Ticket {base_padded} has already been used.")

            base_int = int(base_padded)
            start_int = int(ticket_book.start_number)
            end_int = int(ticket_book.end_number)
            next_int = int(ticket_book.next_number)

            if base_int < start_int or base_int > end_int:
                raise serializers.ValidationError(
                    f"Ticket {base_padded} is outside this book's range ({ticket_book.start_number}–{ticket_book.end_number})."
                )

            if base_int > next_int and not confirm_skip:
                raise serializers.ValidationError({
                    'skip_required': True,
                    'skipped_from': str(next_int).zfill(width),
                    'skipped_to': str(base_int - 1).zfill(width),
                    'detail': f"Tickets {str(next_int).zfill(width)} to {str(base_int - 1).zfill(width)} "
                              f"will be skipped. Confirm to proceed.",
                })

            sale_date = SaleDate.objects.filter(branch=branch, is_open=True).first()
            if not sale_date:
                raise serializers.ValidationError("No sale date is currently open for your branch.")

            bale = Bale.objects.create(
                sale_date=sale_date, branch=branch, captured_by=user,
                ticket_number=base_padded, scanned_barcode=raw_scan,
                **validated_data,
            )

            if base_int >= next_int:
                ticket_book.next_number = str(base_int + 1).zfill(width)
                ticket_book.save(update_fields=['next_number'])

            if dn.status == 'pending':
                dn.status = 'weighed'
                dn.save(update_fields=['status'])

        return bale