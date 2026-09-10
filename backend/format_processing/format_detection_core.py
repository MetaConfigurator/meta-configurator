import re
from dataclasses import dataclass
from datetime import date, datetime, time
from typing import Any

# Optional third-party parser libraries. They are imported here and re-exported
# (the "import x as x" form) so that the parser modules can share one import site and
# degrade gracefully when a library is not installed. The redundant alias plus the
# noqa marker keep linters and type checkers from reporting them as unused.
try:
    import yaml as yaml  # noqa: F401
except ModuleNotFoundError:  # pragma: no cover
    yaml = None

try:
    import xmltodict as xmltodict  # noqa: F401
except ModuleNotFoundError:  # pragma: no cover
    xmltodict = None

try:
    import gemmi as gemmi  # noqa: F401
except ModuleNotFoundError:  # pragma: no cover
    gemmi = None

try:
    import rdflib as rdflib  # noqa: F401
except ModuleNotFoundError:  # pragma: no cover
    rdflib = None


@dataclass(frozen=True)
class ParserAttempt:
    format: str
    parsed_json: Any
    parser_name: str


def has_ini_style_section_headers(content: str) -> bool:
    """Whether the content contains "[section]" lines, which rule out flat key-value formats."""
    return re.search(r"^\s*\[.+\]\s*$", content, flags=re.MULTILINE) is not None


def get_file_extension(file_name: str) -> str:
    if not isinstance(file_name, str):
        return ""
    file_name = file_name.strip().lower()
    if "." not in file_name:
        return ""
    return file_name.rsplit(".", 1)[1]


def to_json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): to_json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [to_json_safe(v) for v in value]
    if isinstance(value, tuple):
        return [to_json_safe(v) for v in value]
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)
