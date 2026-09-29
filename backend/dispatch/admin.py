from django.contrib import admin
from .models import DispatchLoad, DispatchLoadBale


class DispatchLoadBaleInline(admin.TabularInline):
    model = DispatchLoadBale
    extra = 0


@admin.register(DispatchLoad)
class DispatchLoadAdmin(admin.ModelAdmin):
    list_display = ('truck_registration', 'driver_name', 'destination', 'branch', 'is_open', 'dispatch_date')
    inlines = [DispatchLoadBaleInline]