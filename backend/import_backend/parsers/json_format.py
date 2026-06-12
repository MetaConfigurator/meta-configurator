import json
from typing import Optional

from format_detection_core import ParserAttempt
from parsers.common_preprocess import preprocess_data_for_ai


def parse_data(content: str) -> Optional[ParserAttempt]:
    stripped = content.strip()
    if not stripped.startswith('{') and not stripped.startswith('['):
        return None
    try:
        parsed = json.loads(content)
    except Exception:
        return None
    if not isinstance(parsed, (dict, list)):
        return None
    return ParserAttempt(format='json', parsed_json=parsed, parser_name='python-json')

