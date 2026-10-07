from rest_framework import serializers
from .models import PrintSettings


class PrintSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrintSettings
        fields = ['id', 'company_name', 'address', 'phone', 'email', 'logo', 'footer_text']
        read_only_fields = ['id']