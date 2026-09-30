from django.contrib import admin
from .models import RejectionCode, RejectedBale


@admin.register(RejectionCode)
class RejectionCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'description', 'is_active')


@admin.register(RejectedBale)
class RejectedBaleAdmin(admin.ModelAdmin):
    list_display = ('bale', 'rejection_code', 'rejected_by', 'rejected_at')