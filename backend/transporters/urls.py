from rest_framework.routers import DefaultRouter
from .views import TransporterViewSet

router = DefaultRouter()
router.register('transporters', TransporterViewSet, basename='transporter')

urlpatterns = router.urls