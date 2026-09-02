from typing import Optional

from format_detection_core import ParserAttempt
from parsers.star_family_common import looks_like_cif, parse_star_family_json


def parse_data(content: str) -> Optional[ParserAttempt]:
    if not looks_like_cif(content):
        return None

    parsed = parse_star_family_json(content)
    if parsed is None:
        return None

    parsed_json, parser_name = parsed
    normalized_suffix = " (normalized)" if "(normalized)" in parser_name else ""
    return ParserAttempt(
        format="cif",
        parsed_json=parsed_json,
        parser_name=f"gemmi-cif-json{normalized_suffix}",
    )
