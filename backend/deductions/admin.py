from django.contrib import admin
from .models import DeductionRule


@admin.register(DeductionRule)
class DeductionRuleAdmin(admin.ModelAdmin):
    list_display = ('name', 'calculation_type', 'rate', 'currency_treatment', 'is_permanent', 'is_active')