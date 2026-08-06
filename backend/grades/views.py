import csv
import io

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from users.permissions import IsAdminOrReadOnly
from .models import TimbGrade
from .serializers import TimbGradeSerializer


class TimbGradeViewSet(viewsets.ModelViewSet):
    queryset = TimbGrade.objects.all()
    serializer_class = TimbGradeSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['code']

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser])
    def upload_csv(self, request):
        """POST /api/grades/upload_csv/ — multipart file field named 'file'.
        Expects a CSV with header: code
        Upserts by code."""
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        decoded = io.TextIOWrapper(file.file, encoding='utf-8')
        reader = csv.DictReader(decoded)

        created, updated, errors = 0, 0, []
        for i, row in enumerate(reader, start=2):  # row 1 is header
            code = (row.get('code') or '').strip()
            if not code:
                errors.append(f"Row {i}: missing code")
                continue
            obj, was_created = TimbGrade.objects.update_or_create(
                code=code, defaults={'is_active': True}
            )
            created += was_created
            updated += not was_created

        return Response({
            'created': created,
            'updated': updated,
            'errors': errors,
        })