import re
from typing import Optional

from format_detection_core import ParserAttempt, yaml
from parsers.common_preprocess import preprocess_data_for_ai


def parse_data(content: str) -> Optional[ParserAttempt]:
    if yaml is None:
        return None

    stripped = content.strip()
    if stripped.startswith("{") or stripped.startswith("["):
        return None

    try:
        parsed = yaml.safe_load(content)
    except Exception:
        return None

    if not isinstance(parsed, (dict, list)):
        return None

    looks_like_yaml = (
        "---" in content[:200]
        or re.search(r"^\s*[A-Za-z0-9_\-\.]+\s*:\s*", content, flags=re.MULTILINE)
        or re.search(r"^\s*-\s+", content, flags=re.MULTILINE)
    )
    if not looks_like_yaml:
        return None

    return ParserAttempt(
        format="yaml",
        parsed_json=parsed,
        parser_name="pyyaml-safe-load",
    )
