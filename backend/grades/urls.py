from rest_framework.routers import DefaultRouter
from .views import TimbGradeViewSet

router = DefaultRouter()
router.register('grades', TimbGradeViewSet, basename='grade')

urlpatterns = router.urls