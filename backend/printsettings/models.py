from django.db import models


class PrintSettings(models.Model):
    """Singleton — always pk=1."""
    company_name = models.CharField(max_length=150, blank=True, default='')
    address = models.CharField(max_length=255, blank=True, default='')
    phone = models.CharField(max_length=50, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    logo = models.ImageField(upload_to='print_settings/', blank=True, null=True)
    footer_text = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        db_table = 'print_settings'

    def __str__(self):
        return 'Print Settings'

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj