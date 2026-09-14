from typing import Optional

from format_detection_core import ParserAttempt
from parsers.tabular_utils import parse_delimited_rows, rows_to_objects_or_arrays


def looks_like_csv(content: str) -> bool:
    return "," in content and "\n" in content


def parse_data(content: str) -> Optional[ParserAttempt]:
    if "\n" not in content:
        return None

    rows = parse_delimited_rows(content, ",")
    parser_name = "python-csv-comma"
    if not rows:
        rows = parse_delimited_rows(content, ";")
        parser_name = "python-csv-semicolon"
    if not rows:
        return None

    return ParserAttempt(
        format="csv",
        parsed_json=rows_to_objects_or_arrays(rows),
        parser_name=parser_name,
    )
