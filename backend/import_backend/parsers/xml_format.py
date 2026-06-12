from typing import Optional

from format_detection_core import ParserAttempt, xmltodict
from parsers.common_preprocess import preprocess_data_for_ai


def parse_data(content: str) -> Optional[ParserAttempt]:
    if xmltodict is None:
        return None
    if '<' not in content or '>' not in content:
        return None

    try:
        parsed = xmltodict.parse(content)
    except Exception:
        return None

    if not isinstance(parsed, dict) or len(parsed) == 0:
        return None

    return ParserAttempt(
        format='xml',
        parsed_json=parsed,
        parser_name='xmltodict-parse',
    )

