from typing import Optional

from format_detection_core import ParserAttempt
from parsers.common_preprocess import preprocess_data_for_ai
from parsers.star_family_common import (
    document_to_gemmi_json,
    looks_like_cif,
    parse_star_family_document,
)


def parse_data(content: str) -> Optional[ParserAttempt]:
    if not looks_like_cif(content):
        return None

    parsed = parse_star_family_document(content)
    if parsed is None:
        return None

    doc, parser_name = parsed
    parsed_json = document_to_gemmi_json(doc)
    if not parsed_json:
        return None

    normalized_suffix = ' (normalized)' if '(normalized)' in parser_name else ''
    return ParserAttempt(
        format='cif',
        parsed_json=parsed_json,
        parser_name=f'gemmi-cif-json{normalized_suffix}',
    )

