from rest_framework.routers import DefaultRouter
from .views import SeasonViewSet

router = DefaultRouter()
router.register('seasons', SeasonViewSet, basename='season')

urlpatterns = router.urls