from typing import Optional

from format_detection_core import ParserAttempt
from parsers.tabular_utils import parse_delimited_rows, rows_to_objects_or_arrays


def looks_like_tsv(content: str) -> bool:
    return "\t" in content and "\n" in content


def parse_data(content: str) -> Optional[ParserAttempt]:
    if not looks_like_tsv(content):
        return None

    rows = parse_delimited_rows(content, "\t")
    if not rows:
        return None

    return ParserAttempt(
        format="tsv",
        parsed_json=rows_to_objects_or_arrays(rows),
        parser_name="python-csv-tab",
    )
