from rest_framework import serializers
from .models import DispatchLoad, DispatchLoadBale


class DispatchLoadBaleSerializer(serializers.ModelSerializer):
    ticket_number = serializers.CharField(source='bale.ticket_number', read_only=True)
    grower_number = serializers.CharField(source='bale.delivery_note.grower.grower_number', read_only=True)
    buyer_grade = serializers.SerializerMethodField()
    mass = serializers.IntegerField(source='bale.mass', read_only=True)

    class Meta:
        model = DispatchLoadBale
        fields = ['id', 'bale', 'ticket_number', 'grower_number', 'buyer_grade', 'mass', 'scanned_at']

    def get_buyer_grade(self, obj):
        bp = getattr(obj.bale, 'processing', None)
        return bp.effective_buyer_grade if bp else None


class DispatchLoadSerializer(serializers.ModelSerializer):
    items = DispatchLoadBaleSerializer(many=True, read_only=True)
    bale_count = serializers.SerializerMethodField()
    total_mass = serializers.SerializerMethodField()

    class Meta:
        model = DispatchLoad
        fields = [
            'id', 'branch', 'truck_registration', 'driver_name', 'destination', 'dispatch_date',
            'is_open', 'opened_at', 'closed_at', 'items', 'bale_count', 'total_mass',
        ]
        read_only_fields = ['id', 'branch', 'is_open', 'opened_at', 'closed_at', 'items', 'bale_count', 'total_mass']

    def get_bale_count(self, obj):
        return obj.items.count()

    def get_total_mass(self, obj):
        return sum(item.bale.mass for item in obj.items.all())