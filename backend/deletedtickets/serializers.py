from rest_framework import serializers
from .models import DeletedTicketLog


class DeletedTicketLogSerializer(serializers.ModelSerializer):
    dn_number = serializers.CharField(source='delivery_note.dn_number', read_only=True)
    grower_number = serializers.CharField(source='delivery_note.grower.grower_number', read_only=True)

    class Meta:
        model = DeletedTicketLog
        fields = [
            'id', 'delivery_note', 'dn_number', 'grower_number', 'branch',
            'ticket_number', 'group_number', 'lot_number', 'hessian_code', 'mass',
            'reason', 'deleted_at',
        ]
        read_only_fields = fields