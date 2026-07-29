from django.core.validators import RegexValidator
from django.db import models

five_digit_validator = RegexValidator(
    regex=r'^\d{5}$',
    message='Transporter number must be exactly 5 digits.'
)


class Transporter(models.Model):
    transporter_number = models.CharField(
        max_length=5,
        unique=True,
        validators=[five_digit_validator],
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    address = models.CharField(max_length=255, blank=True, null=True)

    bank_name = models.CharField(max_length=100, blank=True, null=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'transporters'
        ordering = ['first_name', 'last_name']

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.transporter_number})"