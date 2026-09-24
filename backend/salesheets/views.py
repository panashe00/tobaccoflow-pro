from decimal import Decimal
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from deliverynotes.models import DeliveryNote
from weighing.models import Bale
from .models import Salesheet, SalesheetDeductionLine, SalesheetCounter
from .serializers import SalesheetSerializer
from .services import compute_salesheet


def _save_lines(salesheet, result):
    lines = [
        SalesheetDeductionLine(salesheet=salesheet, label=l['label'], amount=l['amount'], category='statutory')
        for l in result['statutory_lines']
    ] + [
        SalesheetDeductionLine(salesheet=salesheet, label=l['label'], amount=l['amount'], category='farmer')
        for l in result['farmer_lines']
    ]
    SalesheetDeductionLine.objects.bulk_create(lines)


def _serialize_preview(dn, result):
    return {
        'delivery_note': dn.id,
        'grower_name': f"{dn.grower.first_name} {dn.grower.last_name}",
        'grower_number': dn.grower.grower_number,
        'national_id': dn.grower.national_id,
        'branch': dn.branch,
        'rows': [
            {'bale_id': r['bale_id'], 'group_number': r['group_number'], 'lot_number': r['lot_number'],
             'mass': r['mass'], 'buyer_grade': r['buyer_grade'],
             'price_per_kg': str(r['price_per_kg']), 'value': str(r['value'])}
            for r in result['rows']
        ],
        'total_mass': result['total_mass'], 'gross_value': str(result['gross_value']),
        'statutory_lines': [{'label': l['label'], 'amount': str(l['amount'])} for l in result['statutory_lines']],
        'farmer_lines': [{'label': l['label'], 'amount': str(l['amount'])} for l in result['farmer_lines']],
        'total_deductions': str(result['total_deductions']), 'net_value': str(result['net_value']),
        'usd_portion': str(result['usd_portion']), 'zig_portion': str(result['zig_portion']),
        'bales_incomplete': result['bales_incomplete'], 'bales_expected': result['bales_expected'],
        'bales_captured': result['bales_captured'],
        'unresolved_mismatches': [{'bale_id': r['bale_id'], 'lot_number': r['lot_number']} for r in result['unresolved_mismatches']],
    }


class SalesheetViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Salesheet.objects.all()
    serializer_class = SalesheetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        return qs.filter(branch__in=user.branches) if user.branches else qs.none()

    @action(detail=False, methods=['get'])
    def ready(self, request):
        user = request.user
        branch = user.branches[0] if user.branches else None
        search = request.query_params.get('search', '').strip()

        qs = DeliveryNote.objects.filter(
            branch=branch, sale_date__is_open=True, deductions_completed_at__isnull=False,
        ).exclude(salesheet__isnull=False).select_related('grower', 'sale_date')

        if search:
            qs = qs.filter(
                Q(grower__first_name__icontains=search)
                | Q(grower__last_name__icontains=search)
                | Q(grower__grower_number__icontains=search)
            )

        limit = None if search else 5
        results = []
        for dn in qs.order_by('-created_at')[:limit] if limit else qs.order_by('-created_at'):
            bales_captured = Bale.objects.filter(delivery_note=dn).count()
            processed = Bale.objects.filter(delivery_note=dn, processing__isnull=False).count()
            results.append({
                'delivery_note': dn.id, 'dn_number': dn.dn_number,
                'grower_name': f"{dn.grower.first_name} {dn.grower.last_name}",
                'grower_number': dn.grower.grower_number,
                'bales_expected': dn.number_of_bales, 'bales_captured': bales_captured, 'bales_processed': processed,
            })
        return Response(results)

    @action(detail=False, methods=['get'])
    def today(self, request):
        user = request.user
        branch = user.branches[0] if user.branches else None
        qs = Salesheet.objects.filter(branch=branch, sale_date__is_open=True).order_by('-generated_at')
        return Response(SalesheetSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def preview(self, request):
        dn = DeliveryNote.objects.filter(pk=request.query_params.get('delivery_note')).select_related('sale_date', 'grower').first()
        if not dn:
            return Response({'detail': 'Delivery Note not found.'}, status=404)
        if dn.sale_date.exchange_rate is None:
            return Response({'detail': 'Exchange rate has not been captured for this sale date yet.'}, status=400)

        usd_split = Decimal(request.query_params.get('usd_split_percent', '70'))
        result = compute_salesheet(dn, usd_split, dn.sale_date.exchange_rate)
        return Response(_serialize_preview(dn, result))

    @action(detail=False, methods=['post'])
    def generate(self, request):
        dn = DeliveryNote.objects.filter(pk=request.data.get('delivery_note')).select_related('sale_date', 'grower').first()
        if not dn:
            return Response({'detail': 'Delivery Note not found.'}, status=404)

        user = request.user
        branch = user.branches[0] if user.branches else None
        if dn.branch != branch:
            return Response({'detail': 'This Delivery Note does not belong to your branch.'}, status=400)
        if hasattr(dn, 'salesheet'):
            return Response({'detail': 'A salesheet already exists for this Delivery Note. Use recalculate instead.'}, status=400)
        if dn.sale_date.exchange_rate is None:
            return Response({'detail': 'Exchange rate has not been captured for this sale date yet.'}, status=400)

        usd_split = Decimal(str(request.data.get('usd_split_percent', 70)))
        confirm_incomplete = bool(request.data.get('confirm_incomplete', False))
        result = compute_salesheet(dn, usd_split, dn.sale_date.exchange_rate)

        if result['unresolved_mismatches']:
            return Response({
                'unresolved_mismatches': True,
                'mismatches': [{'bale_id': r['bale_id'], 'lot_number': r['lot_number']} for r in result['unresolved_mismatches']],
                'detail': 'Resolve all flagged mismatches before generating this salesheet.',
            }, status=400)

        if result['bales_incomplete'] and not confirm_incomplete:
            return Response({
                'incomplete_bales': True,
                'bales_expected': result['bales_expected'], 'bales_captured': result['bales_captured'],
                'detail': f"Only {result['bales_captured']} of {result['bales_expected']} bales have been captured. Confirm to proceed anyway.",
            }, status=400)

        with transaction.atomic():
            counter, _ = SalesheetCounter.objects.select_for_update().get_or_create(branch=branch)
            counter.last_number += 1
            counter.save(update_fields=['last_number'])
            reference_number = f"SS-{branch[:3].upper()}-{counter.last_number:06d}"

            salesheet = Salesheet.objects.create(
                reference_number=reference_number, delivery_note=dn, grower=dn.grower,
                sale_date=dn.sale_date, branch=branch, exchange_rate=dn.sale_date.exchange_rate,
                usd_split_percent=usd_split, total_mass=result['total_mass'], gross_value=result['gross_value'],
                statutory_deductions_total=result['statutory_total'], farmer_deductions_total=result['farmer_total'],
                total_deductions=result['total_deductions'], net_value=result['net_value'],
                usd_portion=result['usd_portion'], zig_portion=result['zig_portion'],
                bales_incomplete=result['bales_incomplete'], generated_by=user,
            )
            _save_lines(salesheet, result)

        return Response(SalesheetSerializer(salesheet).data, status=201)

    @action(detail=True, methods=['post'])
    def recalculate(self, request, pk=None):
        salesheet = self.get_object()
        dn = salesheet.delivery_note
        if dn.sale_date.exchange_rate is None:
            return Response({'detail': 'Exchange rate has not been captured for this sale date yet.'}, status=400)

        usd_split = Decimal(str(request.data.get('usd_split_percent', salesheet.usd_split_percent)))
        result = compute_salesheet(dn, usd_split, dn.sale_date.exchange_rate)

        if result['unresolved_mismatches']:
            return Response({
                'unresolved_mismatches': True,
                'mismatches': [{'bale_id': r['bale_id'], 'lot_number': r['lot_number']} for r in result['unresolved_mismatches']],
                'detail': 'Resolve all flagged mismatches before recalculating this salesheet.',
            }, status=400)

        with transaction.atomic():
            salesheet.usd_split_percent = usd_split
            salesheet.exchange_rate = dn.sale_date.exchange_rate
            salesheet.total_mass = result['total_mass']
            salesheet.gross_value = result['gross_value']
            salesheet.statutory_deductions_total = result['statutory_total']
            salesheet.farmer_deductions_total = result['farmer_total']
            salesheet.total_deductions = result['total_deductions']
            salesheet.net_value = result['net_value']
            salesheet.usd_portion = result['usd_portion']
            salesheet.zig_portion = result['zig_portion']
            salesheet.bales_incomplete = result['bales_incomplete']
            salesheet.recalculated_at = timezone.now()
            salesheet.save()
            salesheet.deduction_lines.all().delete()
            _save_lines(salesheet, result)

        return Response(SalesheetSerializer(salesheet).data)

    @action(detail=False, methods=['get'], url_path='grower-lifetime')
    def grower_lifetime(self, request):
        grower_id = request.query_params.get('grower')
        total_mass, total_value = 0, Decimal('0')
        for b in Bale.objects.filter(delivery_note__grower_id=grower_id, processing__isnull=False).select_related('processing'):
            total_mass += b.mass
            total_value += Decimal(b.mass) * Decimal(b.processing.effective_price_per_kg)
        return Response({'total_mass': total_mass, 'total_value': str(total_value)})