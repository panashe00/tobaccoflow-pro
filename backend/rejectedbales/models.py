from django.db import models
from weighing.models import Bale
from users.models import User

class RejectionCode(models.Model):
    code = models.CharField(max_length=20, unique=True)
    description = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'rejection_codes'
        ordering = ['code']

    def __str__(self):
        return f"{self.code} — {self.description}"


class RejectedBale(models.Model):
    """Immutable once created — no update or delete is ever exposed via the API."""
    bale = models.OneToOneField(Bale, on_delete=models.PROTECT, related_name='rejection')
    rejection_code = models.ForeignKey(RejectionCode, on_delete=models.PROTECT, related_name='rejected_bales')
    rejected_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    rejected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rejected_bales'
        ordering = ['-rejected_at']

    def __str__(self):
        return f"Ticket {self.bale.ticket_number} — rejected ({self.rejection_code.code})"