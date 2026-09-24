from django.db import models
from deliverynotes.models import DeliveryNote
from saledates.models import SaleDate
from growers.models import Grower
from users.models import User


class SalesheetCounter(models.Model):
    branch = models.CharField(max_length=20, choices=User.BRANCH_CHOICES, unique=True)
    last_number = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'salesheet_counters'


class Salesheet(models.Model):
    reference_number = models.CharField(max_length=30, unique=True, editable=False)
    delivery_note = models.OneToOneField(DeliveryNote, on_delete=models.PROTECT, related_name='salesheet')
    grower = models.ForeignKey(Grower, on_delete=models.PROTECT, related_name='salesheets')
    sale_date = models.ForeignKey(SaleDate, on_delete=models.PROTECT, related_name='salesheets')
    branch = models.CharField(max_length=20, choices=User.BRANCH_CHOICES)

    exchange_rate = models.DecimalField(max_digits=12, decimal_places=4)
    usd_split_percent = models.DecimalField(max_digits=5, decimal_places=2, default=70)

    total_mass = models.PositiveIntegerField(default=0)
    gross_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    statutory_deductions_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    farmer_deductions_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    net_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    usd_portion = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    zig_portion = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    bales_incomplete = models.BooleanField(default=False)

    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='salesheets_generated')
    generated_at = models.DateTimeField(auto_now_add=True)
    recalculated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'salesheets'

    def __str__(self):
        return self.reference_number


class SalesheetDeductionLine(models.Model):
    CATEGORY_CHOICES = [('statutory', 'Statutory'), ('farmer', 'Farmer')]

    salesheet = models.ForeignKey(Salesheet, on_delete=models.CASCADE, related_name='deduction_lines')
    label = models.CharField(max_length=150)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)

    class Meta:
        db_table = 'salesheet_deduction_lines'