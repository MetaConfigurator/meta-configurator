import json
from typing import Optional

from format_detection_core import ParserAttempt


def looks_like_json(content: str) -> bool:
    return content.lstrip().startswith(("{", "["))


def parse_data(content: str) -> Optional[ParserAttempt]:
    if not looks_like_json(content):
        return None
    try:
        parsed = json.loads(content)
    except Exception:
        return None
    if not isinstance(parsed, (dict, list)):
        return None
    return ParserAttempt(format="json", parsed_json=parsed, parser_name="python-json")
