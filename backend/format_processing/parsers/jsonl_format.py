import json
from typing import Optional

from format_detection_core import ParserAttempt
from parsers.common_preprocess import preprocess_data_for_ai


def parse_data(content: str) -> Optional[ParserAttempt]:
    lines = [line.strip() for line in content.splitlines() if line.strip()]
    if len(lines) < 2:
        return None

    parsed_rows = []
    for line in lines:
        try:
            row = json.loads(line)
        except Exception:
            return None
        parsed_rows.append(row)

    if not any(isinstance(row, (dict, list)) for row in parsed_rows):
        return None

    return ParserAttempt(
        format="jsonl",
        parsed_json=parsed_rows,
        parser_name="python-json-lines",
    )
