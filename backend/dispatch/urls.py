from rest_framework.routers import DefaultRouter
from .views import DispatchLoadViewSet

router = DefaultRouter()
router.register('dispatch-loads', DispatchLoadViewSet, basename='dispatch-load')

urlpatterns = router.urls