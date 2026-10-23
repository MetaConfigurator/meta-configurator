import re
from typing import Optional

from format_detection_core import ParserAttempt
from parsers.star_family_common import parse_star_family_json


def looks_like_star_family(content: str) -> bool:
    content_prefix = content[:1000]
    return any(
        marker in content_prefix for marker in ("data_", "loop_", "save_")
    ) or bool(re.search(r"^\s*_[A-Za-z0-9]", content[:4000], flags=re.MULTILINE))


def parse_data(content: str) -> Optional[ParserAttempt]:
    parsed = parse_star_family_json(content)
    if parsed is None:
        return None

    parsed_json, parser_name = parsed
    return ParserAttempt(
        format="star_family",
        parsed_json=parsed_json,
        parser_name=f"{parser_name}-json",
    )
