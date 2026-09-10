from django.contrib import admin
from .models import GrowerDeduction


@admin.register(GrowerDeduction)
class GrowerDeductionAdmin(admin.ModelAdmin):
    list_display = ('delivery_note', 'name', 'amount', 'is_transporter', 'created_at')
    search_fields = ('delivery_note__dn_number', 'name')