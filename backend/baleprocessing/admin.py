from django.contrib import admin
from .models import BaleProcessing


@admin.register(BaleProcessing)
class BaleProcessingAdmin(admin.ModelAdmin):
    list_display = ('bale', 'buyer_grade', 'price_per_kg', 'grade_mismatch', 'price_mismatch')