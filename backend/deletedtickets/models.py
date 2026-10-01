from django.db import models
from deliverynotes.models import DeliveryNote
from users.models import User


class DeletedTicketLog(models.Model):
    delivery_note = models.ForeignKey(DeliveryNote, on_delete=models.CASCADE, related_name='deleted_ticket_logs')
    branch = models.CharField(max_length=20, choices=User.BRANCH_CHOICES)
    ticket_number = models.CharField(max_length=20)
    group_number = models.PositiveIntegerField()
    lot_number = models.PositiveIntegerField()
    hessian_code = models.CharField(max_length=5)
    mass = models.PositiveIntegerField()
    reason = models.CharField(max_length=255)
    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    deleted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'deleted_ticket_logs'
        ordering = ['-deleted_at']

    def __str__(self):
        return f"Ticket {self.ticket_number} (deleted)"