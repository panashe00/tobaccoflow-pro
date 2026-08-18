from django.db import models
from users.models import User


class SaleDate(models.Model):
    date = models.DateField(unique=True)
    exchange_rate = models.DecimalField(max_digits=12, decimal_places=4)
    is_open = models.BooleanField(default=False)

    opened_at = models.DateTimeField(null=True, blank=True)
    opened_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sale_dates_opened')
    closed_at = models.DateTimeField(null=True, blank=True)
    closed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sale_dates_closed')

    class Meta:
        db_table = 'sale_dates'
        ordering = ['-date']

    def __str__(self):
        return str(self.date)