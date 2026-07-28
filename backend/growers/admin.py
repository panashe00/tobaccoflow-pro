from django.contrib import admin
from .models import Grower


@admin.register(Grower)
class GrowerAdmin(admin.ModelAdmin):
    list_display = ('grower_number', 'first_name', 'last_name', 'branch', 'is_active')
    search_fields = ('grower_number', 'first_name', 'last_name', 'national_id')
    list_filter = ('branch', 'is_active')