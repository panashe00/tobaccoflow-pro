from django.db import models
from deliverynotes.models import DeliveryNote
from users.models import User


class GrowerDeduction(models.Model):
    delivery_note = models.ForeignKey(DeliveryNote, on_delete=models.CASCADE, related_name='grower_deductions')
    name = models.CharField(max_length=150)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    note = models.CharField(max_length=255, blank=True, null=True)
    is_transporter = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'grower_deductions'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.delivery_note.dn_number} — {self.name}"