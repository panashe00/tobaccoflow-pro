from rest_framework.routers import DefaultRouter
from .views import TicketPreProcessingViewSet

router = DefaultRouter()
router.register('ticket-preprocessing', TicketPreProcessingViewSet, basename='ticket-preprocessing')

urlpatterns = router.urls