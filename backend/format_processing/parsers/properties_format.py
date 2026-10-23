import re
from typing import Optional

from jproperties import Properties

from format_detection_core import ParserAttempt, has_ini_style_section_headers


CONTENT_LINE_PATTERN = re.compile(r"^\s*(?![#!])\S.*$", re.MULTILINE)
LINE_CONTINUATION_PATTERN = re.compile(r"\\\n\s*")
# Turtle without a recognized ".ttl" extension can otherwise fall through to this
# parser. Both alternatives require an IRI in angle brackets and no "=", so ordinary
# properties keys such as "base" or "prefix" are not mistaken for RDF directives.
RDF_SYNTAX_PATTERN = re.compile(
    r"^\s*(?i:@?(?:prefix|base))\s[^\n=]*<[^>\s]+>"
    r"|^\s*<[^>\s=]+>\s+<[^>\s=]+>",
    re.MULTILINE,
)


def _every_content_line_has_a_separator(content: str) -> bool:
    """jproperties happily reads prose as whitespace-separated keys and values, so
    require an explicit "=" or ":" on every content line before trusting the format."""
    content_lines = CONTENT_LINE_PATTERN.findall(
        LINE_CONTINUATION_PATTERN.sub("", content)
    )
    return bool(content_lines) and all(
        "=" in line or ":" in line for line in content_lines
    )


def looks_like_properties(content: str) -> bool:
    return bool(
        re.search(r"^\s*[^\s:=#!][^:=]*\s*[:=]\s*.+$", content, flags=re.MULTILINE)
    )


def parse_data(content: str) -> Optional[ParserAttempt]:
    if has_ini_style_section_headers(content):
        return None  # section headers mean this is INI or TOML, not properties
    if RDF_SYNTAX_PATTERN.search(content):
        return None
    if not _every_content_line_has_a_separator(content):
        return None

    properties = Properties()
    try:
        properties.load(content, "utf-8")
    except Exception:
        return None

    if len(properties) < 2:
        return None

    return ParserAttempt(
        format="properties",
        parsed_json={key: value.data for key, value in properties.items()},
        parser_name="jproperties",
    )
