import json
import re
import shlex
from typing import Any, Dict, List, Optional

from format_detection_core import gemmi


CIF_TAG_PATTERN = re.compile(
    r"^\s*_(?:audit|atom_site|cell|chemical|database|diffrn|entity|exptl|publ|"
    r"refine|space_group|struct|symmetry)[_.]",
    re.MULTILINE,
)


def looks_like_cif(content: str) -> bool:
    return CIF_TAG_PATTERN.search(content[:12000]) is not None


def _quote_star_token_if_needed(token: str) -> str:
    if token in {"?", "."}:
        return token
    if token == "":
        return "''"
    if re.search(r"\s", token):
        return "'" + token.replace("'", "\\'") + "'"
    return token


def _split_loop_row_with_tab_support(raw_row: str) -> List[str]:
    """Split a loop row into tokens, keeping empty tab-separated fields as empty."""
    if "\t" not in raw_row:
        try:
            return shlex.split(raw_row, posix=True)
        except Exception:
            return raw_row.split()

    tokens: List[str] = []
    for segment in raw_row.split("\t"):
        stripped_segment = segment.strip()
        if stripped_segment == "":
            tokens.append("")
            continue
        try:
            segment_tokens = shlex.split(stripped_segment, posix=True)
        except Exception:
            segment_tokens = stripped_segment.split()
        tokens.extend(segment_tokens or [""])
    return tokens


def _normalize_loop_row(raw_row: str, column_count: int) -> str:
    tokens = _split_loop_row_with_tab_support(raw_row)
    if len(tokens) > column_count:
        surplus_tokens_merged_into_last = " ".join(tokens[column_count - 1 :])
        tokens = [*tokens[: column_count - 1], surplus_tokens_merged_into_last]

    if len(tokens) != column_count:
        return raw_row

    return " ".join(_quote_star_token_if_needed(token) for token in tokens)


def _normalize_data_block_header(stripped_line: str) -> str:
    block_name = re.sub(r"\s+", "_", stripped_line[len("data_") :].strip())
    return f"data_{block_name}"


def _normalize_tag_without_value(
    source_lines: List[str], line_index: int
) -> Optional[str]:
    """Return a "<tag> ?" placeholder for a tag whose value is missing, else None."""
    stripped_line = source_lines[line_index].strip()
    if not stripped_line.startswith("_"):
        return None
    tag_parts = stripped_line.split(None, 1)
    if len(tag_parts) != 1:
        return None
    next_stripped_line = (
        source_lines[line_index + 1].strip()
        if line_index + 1 < len(source_lines)
        else ""
    )
    if next_stripped_line == ";":  # a multi-line value follows, so the tag has a value
        return None
    return f"{tag_parts[0]} ?"


def _normalize_loop_block(
    source_lines: List[str], line_index: int
) -> tuple[List[str], int]:
    """Normalize a "loop_" header and rows, returning the lines and next index."""
    normalized_lines = ["loop_"]
    line_index += 1

    loop_headers: List[str] = []
    while line_index < len(source_lines):
        header_line = source_lines[line_index].strip()
        if not header_line.startswith("_"):
            break
        loop_headers.append(header_line)
        normalized_lines.append(header_line)
        line_index += 1

    if not loop_headers:
        return normalized_lines, line_index

    while line_index < len(source_lines):
        row_line = source_lines[line_index]
        stripped_row = row_line.strip()
        if stripped_row == "" or stripped_row.startswith("#"):
            normalized_lines.append(row_line)
            line_index += 1
            continue
        if (
            stripped_row.startswith("_")
            or stripped_row.startswith("data_")
            or stripped_row in {"loop_", ";"}
        ):
            break
        normalized_lines.append(_normalize_loop_row(stripped_row, len(loop_headers)))
        line_index += 1

    return normalized_lines, line_index


def normalize_star_family_input(content: str) -> str:
    """Rewrite loose STAR/CIF text into a form gemmi accepts: block names without
    whitespace, value-less tags filled with "?", and loop rows re-quoted per column."""
    source_lines = content.splitlines()
    normalized_lines: List[str] = []

    line_index = 0
    while line_index < len(source_lines):
        stripped_line = source_lines[line_index].strip()

        if stripped_line.startswith("data_"):
            normalized_lines.append(_normalize_data_block_header(stripped_line))
            line_index += 1
            continue

        if stripped_line == "loop_":
            loop_block_lines, line_index = _normalize_loop_block(
                source_lines, line_index
            )
            normalized_lines.extend(loop_block_lines)
            continue

        tag_placeholder_line = _normalize_tag_without_value(source_lines, line_index)
        normalized_lines.append(tag_placeholder_line or source_lines[line_index])
        line_index += 1

    return "\n".join(normalized_lines)


def _parse_star_document(content: str) -> Optional[Any]:
    if gemmi is None:
        return None

    content_prefix = content[:2000]
    if not any(marker in content_prefix for marker in ("data_", "loop_", "save_")):
        return None

    try:
        return gemmi.cif.read_string(content)
    except Exception:
        return None


def parse_star_family_json(content: str) -> Optional[tuple[Dict[str, Any], str]]:
    """Parse STAR-family content into gemmi JSON, retrying once with normalized input.

    Returns the parsed JSON together with the name of the parser variant that worked."""
    parsed_document = _parse_star_document(content)
    parser_name = "gemmi-star-family"
    if parsed_document is None:
        parsed_document = _parse_star_document(normalize_star_family_input(content))
        parser_name = "gemmi-star-family (normalized)"
    if parsed_document is None or len(parsed_document) == 0:
        return None

    try:
        parsed_json = json.loads(parsed_document.as_json(lowercase_names=False))
    except Exception:
        return None
    return (parsed_json, parser_name) if parsed_json else None
