from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import PrintSettings
from .serializers import PrintSettingsSerializer


class PrintSettingsView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        return [IsAuthenticated()] if self.request.method == 'GET' else [IsAdminUser()]

    def get(self, request):
        obj = PrintSettings.get_solo()
        return Response(PrintSettingsSerializer(obj, context={'request': request}).data)

    def patch(self, request):
        obj = PrintSettings.get_solo()
        serializer = PrintSettingsSerializer(obj, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)