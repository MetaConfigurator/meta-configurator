import re
from typing import Optional

from format_detection_core import ParserAttempt, xmltodict


def looks_like_xml(content: str) -> bool:
    return "<?xml" in content[:200] or bool(
        re.search(r"<[A-Za-z_][^>]*>", content[:500])
    )


def parse_data(content: str) -> Optional[ParserAttempt]:
    if xmltodict is None or not looks_like_xml(content):
        return None

    try:
        parsed = xmltodict.parse(content)
    except Exception:
        return None

    if not isinstance(parsed, dict) or len(parsed) == 0:
        return None

    return ParserAttempt(
        format="xml",
        parsed_json=parsed,
        parser_name="xmltodict-parse",
    )
