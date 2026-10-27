from django.db import models
from users.models import User


class Season(models.Model):
    name = models.CharField(max_length=50, unique=True)
    is_open = models.BooleanField(default=True)
    opened_at = models.DateTimeField(auto_now_add=True)
    opened_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='seasons_opened')
    closed_at = models.DateTimeField(null=True, blank=True)
    closed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='seasons_closed')

    class Meta:
        db_table = 'seasons'
        ordering = ['-opened_at']
        constraints = [
            # The database itself guarantees only one season is open at a time.
            models.UniqueConstraint(fields=['is_open'], condition=models.Q(is_open=True), name='one_open_season'),
        ]

    def __str__(self):
        return self.name