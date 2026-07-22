from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.fields import ArrayField
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('accounts', 'Accounts'),
        ('data', 'Data Capturing'),
        ('growers', 'Growers Rep'),
    ]

    BRANCH_CHOICES = [
        ('Harare', 'Harare'),
        ('Karoi', 'Karoi'),
        ('Rusape', 'Rusape'),
        ('Mvurwi', 'Mvurwi'),
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

    branches = ArrayField(
        models.CharField(max_length=20, choices=BRANCH_CHOICES),
        blank=True,
        default=list,
        help_text='Branches this user has access to.'
    )

    class Meta:
        db_table = 'users'