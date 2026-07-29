from django.contrib import admin
from .models import Transporter


@admin.register(Transporter)
class TransporterAdmin(admin.ModelAdmin):
    list_display = ('transporter_number', 'first_name', 'last_name', 'is_active')
    search_fields = ('transporter_number', 'first_name', 'last_name')
    list_filter = ('is_active',)