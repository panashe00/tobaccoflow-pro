from rest_framework.routers import DefaultRouter
from .views import DeductionRuleViewSet

router = DefaultRouter()
router.register('deduction-rules', DeductionRuleViewSet, basename='deduction-rule')

urlpatterns = router.urls