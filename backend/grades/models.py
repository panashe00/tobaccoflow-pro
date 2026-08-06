from django.db import models


class TimbGrade(models.Model):
    code = models.CharField(max_length=6, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'timb_grades'
        ordering = ['code']

    def __str__(self):
        return self.code