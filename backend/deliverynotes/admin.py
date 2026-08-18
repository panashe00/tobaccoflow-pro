from django.contrib import admin
from .models import DeliveryNote, BranchCounter


@admin.register(DeliveryNote)
class DeliveryNoteAdmin(admin.ModelAdmin):
    list_display = ('dn_number', 'grower', 'branch', 'number_of_bales', 'status', 'date_received')
    search_fields = ('dn_number', 'grower__first_name', 'grower__last_name')


@admin.register(BranchCounter)
class BranchCounterAdmin(admin.ModelAdmin):
    list_display = ('branch', 'last_number')