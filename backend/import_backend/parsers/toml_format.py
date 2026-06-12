import re
from typing import Optional

try:
    import tomllib  # Python 3.11+
except ModuleNotFoundError:  # pragma: no cover
    tomllib = None

from format_detection_core import ParserAttempt
from parsers.common_preprocess import preprocess_data_for_ai


def parse_data(content: str) -> Optional[ParserAttempt]:
    if tomllib is None:
        return None

    has_toml_signals = (
        re.search(r'^\s*\[.+\]\s*$', content, flags=re.MULTILINE) is not None
        or re.search(r'^\s*[A-Za-z0-9_\-\.]+\s*=\s*.+$', content, flags=re.MULTILINE) is not None
    )
    if not has_toml_signals:
        return None

    try:
        parsed = tomllib.loads(content)
    except Exception:
        return None

    if not isinstance(parsed, dict) or len(parsed) == 0:
        return None

    return ParserAttempt(
        format='toml',
        parsed_json=parsed,
        parser_name='python-tomllib',
    )

