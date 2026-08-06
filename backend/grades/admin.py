from django.contrib import admin
from .models import TimbGrade


@admin.register(TimbGrade)
class TimbGradeAdmin(admin.ModelAdmin):
    list_display = ('code', 'is_active')
    search_fields = ('code',)