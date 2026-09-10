from django.db import models
from growers.models import Grower
from transporters.models import Transporter
from users.models import User
from saledates.models import SaleDate

BRANCH_CODES = {
    'Harare': 'HRE',
    'Karoi': 'KAR',
    'Mvurwi': 'MVU',
    'Rusape': 'RUS',
}


class BranchCounter(models.Model):
    """Tracks the last-used D-Note sequence number per branch."""
    branch = models.CharField(max_length=20, choices=User.BRANCH_CHOICES, unique=True)
    last_number = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'branch_dn_counters'


class DeliveryNote(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('weighed', 'Weighed'),
        ('verified', 'Verified'),
    ]

    dn_number = models.CharField(max_length=30, unique=True, editable=False)
    sale_date = models.ForeignKey(SaleDate, on_delete=models.PROTECT, related_name='delivery_notes')
    date_received = models.DateField()
    grower = models.ForeignKey(Grower, on_delete=models.PROTECT, related_name='delivery_notes')
    transporter = models.ForeignKey(Transporter, on_delete=models.SET_NULL, null=True, blank=True, related_name='delivery_notes')
    branch = models.CharField(max_length=20, choices=User.BRANCH_CHOICES)
    number_of_bales = models.PositiveIntegerField()
    remarks = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='delivery_notes_created')
    created_at = models.DateTimeField(auto_now_add=True)

    deductions_completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'delivery_notes'
        ordering = ['-created_at']

    def __str__(self):
        return self.dn_number