from django.db import models


class Buyer(models.Model):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=20, unique=True)
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    contact = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    is_active = models.BooleanField(default=True)
    is_current = models.BooleanField(
        default=False,
        help_text="Only one buyer can be the current active buyer system-wide."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'buyers'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class BuyerGrade(models.Model):
    """A buyer's own grade classification — independent of TIMB grades."""
    buyer = models.ForeignKey(Buyer, related_name='grades', on_delete=models.CASCADE)
    code = models.CharField(max_length=8)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'buyer_grades'
        unique_together = ('buyer', 'code')
        ordering = ['code']

    def __str__(self):
        return f"{self.buyer.code} — {self.code}"