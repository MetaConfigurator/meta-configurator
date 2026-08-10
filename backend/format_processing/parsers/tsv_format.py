from typing import Optional

from format_detection_core import ParserAttempt
from parsers.common_preprocess import preprocess_data_for_ai
from parsers.tabular_utils import parse_delimited_rows, rows_to_objects_or_arrays


def parse_data(content: str) -> Optional[ParserAttempt]:
    if "\n" not in content or "\t" not in content:
        return None

    rows = parse_delimited_rows(content, "\t")
    if not rows:
        return None

    return ParserAttempt(
        format="tsv",
        parsed_json=rows_to_objects_or_arrays(rows),
        parser_name="python-csv-tab",
    )
