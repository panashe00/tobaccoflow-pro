"""Code 39 Mod-43 check character utilities.

Code 39 barcodes optionally carry a Mod-43 check character appended after
the encoded data. Our tickets are pre-printed physical books where the
printed/barcoded value already includes this check character, so any scan
coming into the system is `<ticket_number><check_char>`, not the bare
ticket number.
"""

CODE39_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%"


def calculate_mod43_check_char(data: str) -> str:
    """Given the base data string (e.g. '760676401'), return its Mod-43 check character."""
    if not data:
        raise ValueError("data must not be empty")
    total = 0
    for ch in data.upper():
        idx = CODE39_CHARSET.find(ch)
        if idx == -1:
            raise ValueError(f"Character '{ch}' is not valid in Code 39.")
        total += idx
    return CODE39_CHARSET[total % 43]


def split_and_validate_scan(scanned: str):
    """Given a raw scan (data + check char), return (base_number, is_valid).
    is_valid is False if the scan is malformed or the checksum doesn't match."""
    scanned = (scanned or "").strip()
    if len(scanned) < 2:
        return scanned, False
    base, check_char = scanned[:-1], scanned[-1]
    try:
        expected = calculate_mod43_check_char(base)
    except ValueError:
        return base, False
    return base, expected.upper() == check_char.upper()