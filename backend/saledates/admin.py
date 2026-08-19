from django.contrib import admin
from .models import SaleDate


@admin.register(SaleDate)
class SaleDateAdmin(admin.ModelAdmin):
    list_display = ('branch', 'date', 'exchange_rate', 'is_open')
    list_filter = ('branch', 'is_open')