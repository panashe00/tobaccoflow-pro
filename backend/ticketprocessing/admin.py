from django.contrib import admin
from .models import TicketPreProcessing


@admin.register(TicketPreProcessing)
class TicketPreProcessingAdmin(admin.ModelAdmin):
    list_display = ('bale', 'timb_grade', 'buyer', 'buyer_grade', 'price_per_kg')