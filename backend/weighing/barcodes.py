import re

CODE39_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%"


def calculate_mod43_check_char(data: str) -> str:
    if not data:
        raise ValueError("data must not be empty")
    total = 0
    for ch in data.upper():
        idx = CODE39_CHARSET.find(ch)
        if idx == -1:
            raise ValueError(f"Character '{ch}' is not valid in Code 39.")
        total += idx
    return CODE39_CHARSET[total % 43]


def clean_scan(raw: str) -> str:
    """Strip only trailing control characters a keyboard-wedge scanner may send
    (Enter/Tab) — never plain spaces, since space is a valid Code 39 character
    and can legitimately be the check character itself."""
    if raw is None:
        return ""
    return re.sub(r'[\r\n\t]+$', '', raw)


def split_and_validate_scan(scanned: str):
    cleaned = clean_scan(scanned)
    if len(cleaned) < 2:
        return cleaned, False
    base, check_char = cleaned[:-1], cleaned[-1]
    try:
        expected = calculate_mod43_check_char(base)
    except ValueError:
        return base, False
    return base, expected.upper() == check_char.upper()