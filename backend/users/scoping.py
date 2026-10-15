def scope_by_branch(qs, user, field='branch'):
    """Super admins see everything; everyone else only their branches.
    A user with NO branches sees nothing (the old pattern let them see everything)."""
    if user.is_superuser:
        return qs
    if not user.branches:
        return qs.none()
    return qs.filter(**{f'{field}__in': user.branches})


def in_user_branches(user, branch):
    return user.is_superuser or branch in user.branches