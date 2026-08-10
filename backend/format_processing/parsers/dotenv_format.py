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
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            return None

        key, value = line.split("=", 1)
        key = key.strip()
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
            return None

        value = value.strip()
        if value and value[0] not in {'"', "'"} and " #" in value:
            value = value.split(" #", 1)[0].rstrip()

        parsed[key] = strip_wrapping_quotes(value)
        assignment_count += 1

    if assignment_count < 2:
        return None

    return ParserAttempt(
        format="dotenv",
        parsed_json=parsed,
        parser_name="dotenv-text-parser",
    )
