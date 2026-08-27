from rest_framework.routers import DefaultRouter
from .views import ScaleViewSet, HessianCodeViewSet, TicketBookViewSet, BaleViewSet

router = DefaultRouter()
router.register('scales', ScaleViewSet, basename='scale')
router.register('hessian-codes', HessianCodeViewSet, basename='hessian-code')
router.register('ticket-books', TicketBookViewSet, basename='ticket-book')
router.register('bales', BaleViewSet, basename='bale')

urlpatterns = router.urls