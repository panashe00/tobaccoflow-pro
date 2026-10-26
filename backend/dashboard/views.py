from datetime import date
from decimal import Decimal

from django.db.models import Count, DecimalField, ExpressionWrapper, F, Q, Sum
from django.db.models.functions import Coalesce, ExtractMonth, ExtractYear
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from baleprocessing.models import BaleProcessing
from deliverynotes.models import DeliveryNote
from dispatch.models import DispatchLoad, DispatchLoadBale
from saledates.models import SaleDate
from salesheets.models import Salesheet
from users.models import User
from weighing.models import Bale

# mass x effective price (a resolved correction wins over the originally captured price)
VALUE = ExpressionWrapper(
    F('bale__mass') * Coalesce('resolved_price_per_kg', 'price_per_kg'),
    output_field=DecimalField(max_digits=18, decimal_places=4),
)

MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        branches = [b for b, _ in User.BRANCH_CHOICES] if user.is_superuser else list(user.branches)
        today = timezone.localdate()

        open_dates = list(SaleDate.objects.filter(is_open=True, branch__in=branches))
        open_ids = [s.id for s in open_dates]

        notes = DeliveryNote.objects.filter(sale_date__in=open_ids)
        bales = Bale.objects.filter(sale_date__in=open_ids)
        processing = BaleProcessing.objects.filter(bale__sale_date__in=open_ids)
        loads_today = DispatchLoad.objects.filter(branch__in=branches, dispatch_date=today)

        kpis = {
            'growers_today': notes.values('grower').distinct().count(),
            'bales_received': notes.aggregate(n=Sum('number_of_bales'))['n'] or 0,
            'bales_weighed': bales.count(),
            'salesheets': Salesheet.objects.filter(sale_date__in=open_ids).count(),
            'dispatches': loads_today.count(),
            'dispatch_bales': DispatchLoadBale.objects.filter(load__in=loads_today).count(),
            'pending_verification': bales.filter(processing__isnull=True, rejection__isnull=True).count(),
            'unresolved_mismatches': processing.filter(
                Q(grade_mismatch=True) | Q(price_mismatch=True),
                resolved_buyer_grade__isnull=True, resolved_price_per_kg__isnull=True,
            ).count(),
            'value_today': str(processing.aggregate(v=Sum(VALUE))['v'] or Decimal('0')),
        }

        # Daily intake: bales received per sale date, last 14 sale dates
        intake_rows = (
            DeliveryNote.objects.filter(branch__in=branches)
            .values('sale_date__date').annotate(bales=Sum('number_of_bales'))
            .order_by('-sale_date__date')[:14]
        )
        intake = [
            {'day': r['sale_date__date'].strftime('%d %b'), 'bales': r['bales']}
            for r in reversed(list(intake_rows))
        ]

        # Branch performance: value purchased this month, per branch
        branch_rows = (
            BaleProcessing.objects.filter(
                bale__branch__in=branches,
                bale__sale_date__date__year=today.year,
                bale__sale_date__date__month=today.month,
            )
            .values('bale__branch').annotate(value=Sum(VALUE)).order_by('-value')
        )
        branch_performance = [
            {'branch': r['bale__branch'], 'value': float(r['value'] or 0)} for r in branch_rows
        ]

        # Monthly comparison: this year vs last year, by sale-date month
        monthly_rows = (
            BaleProcessing.objects.filter(
                bale__branch__in=branches,
                bale__sale_date__date__gte=date(today.year - 1, 1, 1),
                bale__sale_date__date__lte=date(today.year, 12, 31),
            )
            .annotate(y=ExtractYear('bale__sale_date__date'), m=ExtractMonth('bale__sale_date__date'))
            .values('y', 'm').annotate(value=Sum(VALUE))
        )
        cur, prev = {m: 0.0 for m in range(1, 13)}, {m: 0.0 for m in range(1, 13)}
        for r in monthly_rows:
            (cur if r['y'] == today.year else prev)[r['m']] = float(r['value'] or 0)
        monthly = [
            {
                'month': MONTHS[i - 1],
                'current': cur[i] if i <= today.month else None,  # no line for future months
                'previous': prev[i],
            }
            for i in range(1, 13)
        ]

        recent_notes = [
            {
                'id': n.id, 'dn_number': n.dn_number,
                'grower_name': f"{n.grower.first_name} {n.grower.last_name}",
                'bales': n.number_of_bales,
            }
            for n in DeliveryNote.objects.filter(branch__in=branches)
            .select_related('grower').order_by('-created_at')[:5]
        ]
        recent_tickets = [
            {
                'id': bp.id, 'ticket_number': bp.bale.ticket_number,
                'grade': bp.effective_buyer_grade, 'price': str(bp.effective_price_per_kg),
            }
            for bp in BaleProcessing.objects.filter(bale__branch__in=branches)
            .select_related('bale').order_by('-processed_at')[:5]
        ]
        recent_loads = [
            {
                'id': l.id, 'truck_registration': l.truck_registration, 'destination': l.destination,
                'bales': l.n, 'is_open': l.is_open,
            }
            for l in DispatchLoad.objects.filter(branch__in=branches)
            .annotate(n=Count('items')).order_by('-opened_at')[:5]
        ]

        return Response({
            'scope': {
                'branches': branches,
                'sale_dates': [
                    {'branch': s.branch, 'date': s.date.isoformat(), 'has_rate': s.exchange_rate is not None}
                    for s in open_dates
                ],
            },
            'kpis': kpis,
            'intake': intake,
            'branch_performance': branch_performance,
            'monthly': monthly,
            'recent_notes': recent_notes,
            'recent_tickets': recent_tickets,
            'recent_loads': recent_loads,
        })