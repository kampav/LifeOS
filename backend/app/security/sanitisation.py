import bleach
import re


def strip_html(value: str | None) -> str | None:
    if value is None:
        return None
    return bleach.clean(value, tags=[], strip=True)


def sanitise_dict(d: dict | None, max_key_len: int = 50, max_val_len: int = 500) -> dict | None:
    if not d:
        return d
    return {
        str(k)[:max_key_len]: str(v)[:max_val_len]
        for k, v in d.items()
        if isinstance(k, str) and len(k) < max_key_len
    }
