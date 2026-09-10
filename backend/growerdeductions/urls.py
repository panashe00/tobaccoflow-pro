from rest_framework.routers import DefaultRouter
from .views import GrowerDeductionViewSet

router = DefaultRouter()
router.register('grower-deductions', GrowerDeductionViewSet, basename='grower-deduction')

urlpatterns = router.urls