from django.contrib import admin
from .models import Scale, HessianCode, TicketBook, Bale


@admin.register(Scale)
class ScaleAdmin(admin.ModelAdmin):
    list_display = ('name', 'branch', 'is_active')


@admin.register(HessianCode)
class HessianCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'is_active')


@admin.register(TicketBook)
class TicketBookAdmin(admin.ModelAdmin):
    list_display = ('branch', 'start_number', 'end_number', 'next_number', 'is_active')


@admin.register(Bale)
class BaleAdmin(admin.ModelAdmin):
    list_display = ('delivery_note', 'lot_number', 'hessian_code', 'mass', 'ticket_number', 'branch')
    search_fields = ('delivery_note__dn_number', 'ticket_number')