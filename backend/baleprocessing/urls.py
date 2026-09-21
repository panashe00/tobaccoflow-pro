from rest_framework.routers import DefaultRouter
from .views import BaleProcessingViewSet

router = DefaultRouter()
router.register('bale-processing', BaleProcessingViewSet, basename='bale-processing')

urlpatterns = router.urls