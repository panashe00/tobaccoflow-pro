from rest_framework.routers import DefaultRouter
from .views import GrowerViewSet

router = DefaultRouter()
router.register('growers', GrowerViewSet, basename='grower')

urlpatterns = router.urls