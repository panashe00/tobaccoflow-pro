from django.db import models
from weighing.models import Bale
from buyers.models import Buyer
from users.models import User


class TicketPreProcessing(models.Model):
    bale = models.OneToOneField(Bale, on_delete=models.CASCADE, related_name='pre_processing')
    timb_grade = models.CharField(max_length=20)
    buyer = models.ForeignKey(Buyer, on_delete=models.PROTECT, related_name='pre_processed_tickets')
    buyer_grade = models.CharField(max_length=20)
    price_per_kg = models.DecimalField(max_digits=8, decimal_places=4)
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    processed_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ticket_pre_processing'

    def __str__(self):
        return f"Ticket {self.bale.ticket_number}"