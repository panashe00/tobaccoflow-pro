from decimal import Decimal
from weighing.models import Bale
from deductions.models import DeductionRule
from growerdeductions.models import GrowerDeduction


def get_bale_rows(dn):
    rows = []
    for bale in Bale.objects.filter(delivery_note=dn).select_related('processing'):
        bp = getattr(bale, 'processing', None)
        if not bp:
            continue
        price = bp.effective_price_per_kg
        rows.append({
            'bale_id': bale.id,
            'group_number': bale.group_number,
            'lot_number': bale.lot_number,
            'mass': bale.mass,
            'buyer_grade': bp.effective_buyer_grade,
            'price_per_kg': price,
            'value': Decimal(bale.mass) * Decimal(price),
            'has_unresolved_mismatch': bp.has_mismatch and not bp.is_resolved,
        })
    return rows


def compute_salesheet(dn, usd_split_percent, exchange_rate):
    rows = get_bale_rows(dn)
    total_mass = sum(r['mass'] for r in rows)
    gross_value = sum((r['value'] for r in rows), Decimal('0'))
    bales_captured = Bale.objects.filter(delivery_note=dn).count()

    statutory_lines, statutory_total = [], Decimal('0')
    for rule in DeductionRule.objects.filter(is_active=True):
        amount = (
            gross_value * (Decimal(rule.rate) / Decimal('100'))
            if rule.calculation_type == 'percentage_of_value'
            else Decimal(rule.rate) * bales_captured
        )
        statutory_lines.append({'label': rule.name, 'amount': amount})
        statutory_total += amount

    farmer_lines, farmer_total = [], Decimal('0')
    for gd in GrowerDeduction.objects.filter(delivery_note=dn):
        farmer_lines.append({'label': gd.name, 'amount': Decimal(gd.amount)})
        farmer_total += Decimal(gd.amount)

    total_deductions = statutory_total + farmer_total
    net_value = gross_value - total_deductions

    usd_ratio = Decimal(str(usd_split_percent)) / Decimal('100')
    usd_portion = net_value * usd_ratio
    zig_portion = (net_value - usd_portion) * Decimal(exchange_rate)

    return {
        'rows': rows, 'total_mass': total_mass, 'gross_value': gross_value,
        'statutory_lines': statutory_lines, 'statutory_total': statutory_total,
        'farmer_lines': farmer_lines, 'farmer_total': farmer_total,
        'total_deductions': total_deductions, 'net_value': net_value,
        'usd_portion': usd_portion, 'zig_portion': zig_portion,
        'bales_incomplete': bales_captured < dn.number_of_bales,
        'bales_captured': bales_captured, 'bales_expected': dn.number_of_bales,
        'unresolved_mismatches': [r for r in rows if r['has_unresolved_mismatch']],
    }