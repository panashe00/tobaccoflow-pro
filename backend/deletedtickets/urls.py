from rest_framework.routers import DefaultRouter
from .views import DeletedTicketViewSet

router = DefaultRouter()
router.register('deleted-tickets', DeletedTicketViewSet, basename='deleted-ticket')

urlpatterns = router.urls