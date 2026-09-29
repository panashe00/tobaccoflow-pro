from django.db import models
from weighing.models import Bale
from users.models import User


class DispatchLoad(models.Model):
    branch = models.CharField(max_length=20, choices=User.BRANCH_CHOICES)
    truck_registration = models.CharField(max_length=30)
    driver_name = models.CharField(max_length=100)
    destination = models.CharField(max_length=150)
    dispatch_date = models.DateField()
    is_open = models.BooleanField(default=True)
    opened_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='loads_opened')
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='loads_closed')
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'dispatch_loads'
        ordering = ['-opened_at']

    def __str__(self):
        return f"{self.truck_registration} — {self.destination}"


class DispatchLoadBale(models.Model):
    load = models.ForeignKey(DispatchLoad, on_delete=models.CASCADE, related_name='items')
    bale = models.OneToOneField(Bale, on_delete=models.PROTECT, related_name='dispatch_item')
    scanned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    scanned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'dispatch_load_bales'
        ordering = ['scanned_at']