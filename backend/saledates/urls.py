from rest_framework.routers import DefaultRouter
from .views import SaleDateViewSet

router = DefaultRouter()
router.register('sale-dates', SaleDateViewSet, basename='sale-date')

urlpatterns = router.urls