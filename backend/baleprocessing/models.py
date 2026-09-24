from django.db import models
from weighing.models import Bale
from users.models import User


class BaleProcessing(models.Model):
    bale = models.OneToOneField(Bale, on_delete=models.CASCADE, related_name='processing')
    buyer_grade = models.CharField(max_length=20)
    price_per_kg = models.DecimalField(max_digits=8, decimal_places=4)
    grade_mismatch = models.BooleanField(default=False)
    price_mismatch = models.BooleanField(default=False)
    resolved_buyer_grade = models.CharField(max_length=20, blank=True, null=True)
    resolved_price_per_kg = models.DecimalField(max_digits=8, decimal_places=4, blank=True, null=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    resolved_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='bale_processing_done')
    processed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bale_processing'

    @property
    def has_mismatch(self):
        return self.grade_mismatch or self.price_mismatch

    @property
    def is_resolved(self):
        return self.resolved_buyer_grade is not None or self.resolved_price_per_kg is not None

    @property
    def effective_buyer_grade(self):
        return self.resolved_buyer_grade or self.buyer_grade

    @property
    def effective_price_per_kg(self):
        return self.resolved_price_per_kg if self.resolved_price_per_kg is not None else self.price_per_kg

    def __str__(self):
        return f"Ticket {self.bale.ticket_number} — processing"