from django.contrib import admin
from .models import PrintSettings


@admin.register(PrintSettings)
class PrintSettingsAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'phone', 'email')