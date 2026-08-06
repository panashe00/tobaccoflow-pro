from django.db import migrations


def seed_deductions(apps, schema_editor):
    DeductionRule = apps.get_model('deductions', 'DeductionRule')
    rules = [
        ('Floor Commission', 'percentage_of_value', 2.5, 'usd', 1),
        ('Growers Levy (Part 1)', 'percentage_of_value', 0.875, 'split', 2),
        ('Growers Levy (Part 2)', 'percentage_of_value', 0.875, 'split', 3),
        ('Selling and Weighing', 'fixed_per_bale', 7.5, 'usd', 4),
        ('Afforestation Levy', 'percentage_of_value', 0.75, 'zig', 5),
        ('Service Charge', 'percentage_of_value', 2.5, 'usd', 6),
        ('Bank Charges', 'percentage_of_value', 1.5, 'split', 7),
    ]
    for name, calc_type, rate, currency, order in rules:
        DeductionRule.objects.update_or_create(
            name=name,
            defaults=dict(
                calculation_type=calc_type,
                rate=rate,
                currency_treatment=currency,
                is_permanent=True,
                is_active=True,
                order=order,
            ),
        )


def reverse_seed(apps, schema_editor):
    DeductionRule = apps.get_model('deductions', 'DeductionRule')
    DeductionRule.objects.filter(is_permanent=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('deductions', '0001_initial'),
    ]
    operations = [
        migrations.RunPython(seed_deductions, reverse_seed),
    ]