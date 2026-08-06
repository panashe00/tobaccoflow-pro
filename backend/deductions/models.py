from django.db import models

class DeductionRule(models.Model):
    CALCULATION_CHOICES = [
        ('percentage_of_value', 'Percentage of Total Value'),
        ('fixed_per_bale', 'Fixed Amount per Bale'),
    ]
    CURRENCY_CHOICES = [
        ('usd', 'USD'),
        ('zig', 'ZIG'),
        ('split', 'Split USD/ZIG'),
    ]

    name = models.CharField(max_length=100, unique=True)
    calculation_type = models.CharField(max_length=30, choices=CALCULATION_CHOICES)
    rate = models.DecimalField(
        max_digits=8, decimal_places=4,
        help_text="Percentage value (e.g. 2.5 for 2.5%) or fixed USD amount, depending on calculation_type."
    )
    currency_treatment = models.CharField(max_length=10, choices=CURRENCY_CHOICES, default='usd')
    is_permanent = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'deduction_rules'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name