from django.urls import path
from .views import PrintSettingsView

urlpatterns = [
    path('print-settings/', PrintSettingsView.as_view(), name='print-settings'),
]