import re
from io import StringIO
from typing import Optional

from dotenv.parser import parse_stream

from format_detection_core import ParserAttempt, has_ini_style_section_headers


def looks_like_dotenv(content: str) -> bool:
    return bool(
        re.search(
            r"^\s*(export\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=\s*.+$",
            content,
            flags=re.MULTILINE,
        )
    )


def parse_data(content: str) -> Optional[ParserAttempt]:
    if has_ini_style_section_headers(content):
        return None  # section headers mean this is INI or TOML, not dotenv

    bindings = list(parse_stream(StringIO(content)))
    if any(binding.error for binding in bindings):
        return None

    assignments = {
        binding.key: binding.value or ""
        for binding in bindings
        if binding.key is not None
    }
    if len(assignments) < 2:
        return None

    return ParserAttempt(
        format="dotenv",
        parsed_json=assignments,
        parser_name="python-dotenv",
    )
