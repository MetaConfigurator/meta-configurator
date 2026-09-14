import re
from typing import List, Optional

from markdown_it import MarkdownIt

from format_detection_core import ParserAttempt
from parsers.tabular_utils import rows_to_objects_or_arrays


MARKDOWN_PARSER = MarkdownIt().enable("table")


def looks_like_markdown_table(content: str) -> bool:
    """Cheap pre-check that avoids a full Markdown parse during format detection."""
    return bool(
        re.search(r"^\s*\|.+\|\s*$", content, flags=re.MULTILINE)
        and re.search(
            r"^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$",
            content,
            flags=re.MULTILINE,
        )
    )


def _extract_first_table_rows(content: str) -> Optional[List[List[str]]]:
    """Return the cells of the first GFM table, header row first."""
    rows: List[List[str]] = []
    current_row: Optional[List[str]] = None
    inside_table = False

    for token in MARKDOWN_PARSER.parse(content):
        if token.type == "table_open":
            inside_table = True
        elif token.type == "table_close":
            return rows or None
        elif not inside_table:
            continue
        elif token.type == "tr_open":
            current_row = []
        elif token.type == "tr_close" and current_row is not None:
            rows.append(current_row)
            current_row = None
        elif token.type == "inline" and current_row is not None:
            current_row.append(token.content.strip())

    return None


def parse_data(content: str) -> Optional[ParserAttempt]:
    rows = _extract_first_table_rows(content)
    if rows is None or len(rows) < 2 or len(rows[0]) < 2:
        return None

    return ParserAttempt(
        format="markdown_table",
        parsed_json=rows_to_objects_or_arrays(rows),
        parser_name="markdown-it-py",
    )
