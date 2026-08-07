from rest_framework.routers import DefaultRouter
from .views import BuyerViewSet, BuyerGradeViewSet

router = DefaultRouter()
router.register('buyers', BuyerViewSet, basename='buyer')
router.register('buyer-grades', BuyerGradeViewSet, basename='buyer-grade')

urlpatterns = router.urls