from django.contrib import admin
from .models import Salesheet


@admin.register(Salesheet)
class SalesheetAdmin(admin.ModelAdmin):
    list_display = ('reference_number', 'grower', 'branch', 'net_value', 'generated_at')
    search_fields = ('reference_number', 'grower__first_name', 'grower__last_name')