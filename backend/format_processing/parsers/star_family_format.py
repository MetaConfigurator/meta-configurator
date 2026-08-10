from typing import Optional

from format_detection_core import ParserAttempt
from parsers.common_preprocess import preprocess_data_for_ai
from parsers.star_family_common import (
    document_to_gemmi_json,
    parse_star_family_document,
)


def parse_data(content: str) -> Optional[ParserAttempt]:
    parsed = parse_star_family_document(content)
    if parsed is None:
        return None

    doc, parser_name = parsed
    parsed_json = document_to_gemmi_json(doc)
    if not parsed_json:
        return None

    return ParserAttempt(
        format="star_family",
        parsed_json=parsed_json,
        parser_name=f"{parser_name}-json",
    )
