from rest_framework.routers import DefaultRouter
from .views import SalesheetViewSet

router = DefaultRouter()
router.register('salesheets', SalesheetViewSet, basename='salesheet')

urlpatterns = router.urls