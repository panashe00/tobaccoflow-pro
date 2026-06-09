from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('accounts', 'Accounts'),
        ('data', 'Data Capturing'),
        ('growers', 'Growers Rep'),
    ]

    contact = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='data'
    )

    class Meta:
        db_table = 'users'