from rest_framework.routers import DefaultRouter
from .views import RejectionCodeViewSet, RejectedBaleViewSet

router = DefaultRouter()
router.register('rejection-codes', RejectionCodeViewSet, basename='rejection-code')
router.register('rejected-bales', RejectedBaleViewSet, basename='rejected-bale')

urlpatterns = router.urls