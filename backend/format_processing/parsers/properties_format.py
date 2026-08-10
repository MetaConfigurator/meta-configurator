import re
from typing import Dict, Optional

from format_detection_core import ParserAttempt
from parsers.common_preprocess import preprocess_data_for_ai
from parsers.key_value_utils import strip_wrapping_quotes


def parse_data(content: str) -> Optional[ParserAttempt]:
    if re.search(r"^\s*\[.+\]\s*$", content, flags=re.MULTILINE):
        return None

    parsed: Dict[str, str] = {}
    assignment_count = 0
    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or line.startswith("!"):
            continue

        match = re.match(r"^([^:=\s][^:=]*)\s*([:=])\s*(.*)$", line)
        if not match:
            return None

        key = match.group(1).strip()
        value = match.group(3).strip()
        parsed[key] = strip_wrapping_quotes(value)
        assignment_count += 1

    if assignment_count < 2:
        return None

    return ParserAttempt(
        format="properties",
        parsed_json=parsed,
        parser_name="properties-text-parser",
    )
