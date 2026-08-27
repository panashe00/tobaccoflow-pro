from django.core.validators import RegexValidator
from django.db import models
from users.models import User
from deliverynotes.models import DeliveryNote
from saledates.models import SaleDate

hessian_validator = RegexValidator(regex=r'^[A-Za-z]{2,5}$', message='Hessian code must be 2-5 letters.')


class Scale(models.Model):
    name = models.CharField(max_length=50)
    branch = models.CharField(max_length=20, choices=User.BRANCH_CHOICES)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'scales'
        unique_together = ('name', 'branch')

    def __str__(self):
        return f"{self.name} ({self.branch})"


class HessianCode(models.Model):
    code = models.CharField(max_length=5, unique=True, validators=[hessian_validator])
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'hessian_codes'
        ordering = ['code']

    def __str__(self):
        return self.code


class TicketBook(models.Model):
    branch = models.CharField(max_length=20, choices=User.BRANCH_CHOICES)
    start_number = models.PositiveIntegerField()
    end_number = models.PositiveIntegerField()
    next_number = models.PositiveIntegerField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'ticket_books'
        ordering = ['branch', 'start_number']

    def save(self, *args, **kwargs):
        if self._state.adding and not self.next_number:
            self.next_number = self.start_number
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.branch}: {self.start_number}-{self.end_number}"


class Bale(models.Model):
    delivery_note = models.ForeignKey(DeliveryNote, on_delete=models.CASCADE, related_name='bales')
    sale_date = models.ForeignKey(SaleDate, on_delete=models.PROTECT, related_name='bales')
    branch = models.CharField(max_length=20, choices=User.BRANCH_CHOICES)
    group_number = models.PositiveIntegerField()
    lot_number = models.PositiveIntegerField()
    hessian_code = models.CharField(max_length=5)
    mass = models.PositiveIntegerField(help_text="Whole kilograms")
    ticket_number = models.PositiveIntegerField(unique=True)
    scale = models.ForeignKey(Scale, on_delete=models.SET_NULL, null=True)
    captured_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bales'
        unique_together = ('delivery_note', 'lot_number')
        ordering = ['created_at']

    def __str__(self):
        return f"{self.delivery_note.dn_number} — Lot {self.lot_number}"