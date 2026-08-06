from django.contrib import admin
from .models import Buyer, BuyerGrade

class BuyerGradeInline(admin.TabularInline):
    model = BuyerGrade
    extra = 1

@admin.register(Buyer)
class BuyerAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_active')
    search_fields = ('name', 'code')
    inlines = [BuyerGradeInline]