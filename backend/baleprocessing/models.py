from django.db import models
from weighing.models import Bale
from users.models import User


class BaleProcessing(models.Model):
    bale = models.OneToOneField(Bale, on_delete=models.CASCADE, related_name='processing')
    buyer_grade = models.CharField(max_length=20)
    price_per_kg = models.DecimalField(max_digits=8, decimal_places=4)
    grade_mismatch = models.BooleanField(default=False)
    price_mismatch = models.BooleanField(default=False)
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    processed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bale_processing'

    @property
    def has_mismatch(self):
        return self.grade_mismatch or self.price_mismatch

    def __str__(self):
        return f"Ticket {self.bale.ticket_number} — processing"