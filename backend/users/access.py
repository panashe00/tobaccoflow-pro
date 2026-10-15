from .models import User, RolePermission

MODULES = [
    ('growers', 'Growers'),
    ('transporters', 'Transporters'),
    ('delivery_notes', 'Delivery Notes'),
    ('weighing', 'Bale Weighing'),
    ('deductions', 'Deductions'),
    ('pre_processing', 'Ticket Pre-Processing'),
    ('processing', 'Bale Processing'),
    ('salesheet', 'Salesheets'),
    ('dispatch', 'Dispatch'),
    ('reports', 'Reports'),
]
MODULE_KEYS = [k for k, _ in MODULES]

# Placeholders until adjusted in Settings > Permissions.
DEFAULT_ROLE_MODULES = {
    'accounts': {'deductions', 'salesheet', 'dispatch', 'reports'},
    'data': {'delivery_notes', 'weighing', 'pre_processing', 'processing'},
    'growers': {'growers', 'transporters', 'delivery_notes'},
}


def is_branch_admin(user):
    return bool(user and user.is_authenticated and (user.role == 'admin' or user.is_superuser))


def allowed_modules(user):
    if is_branch_admin(user):
        return list(MODULE_KEYS)
    stored = dict(RolePermission.objects.filter(role=user.role).values_list('module', 'allowed'))
    defaults = DEFAULT_ROLE_MODULES.get(user.role, set())
    return [m for m in MODULE_KEYS if stored.get(m, m in defaults)]


def has_module(user, module):
    return module in allowed_modules(user)


def role_matrix():
    stored = {(r.role, r.module): r.allowed for r in RolePermission.objects.all()}
    matrix = {}
    for role, _ in User.ROLE_CHOICES:
        if role == 'admin':
            matrix[role] = {m: True for m in MODULE_KEYS}
        else:
            defaults = DEFAULT_ROLE_MODULES.get(role, set())
            matrix[role] = {m: stored.get((role, m), m in defaults) for m in MODULE_KEYS}
    return matrix