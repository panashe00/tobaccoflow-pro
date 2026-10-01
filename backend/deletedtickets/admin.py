from django.contrib import admin
from .models import DeletedTicketLog


@admin.register(DeletedTicketLog)
class DeletedTicketLogAdmin(admin.ModelAdmin):
    list_display = ('ticket_number', 'delivery_note', 'reason', 'deleted_by', 'deleted_at')