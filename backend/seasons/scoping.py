from .models import Season


def current_season():
    return Season.objects.filter(is_open=True).first()