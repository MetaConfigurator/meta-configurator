import csv
import io
import re
from typing import Any, List, Optional


def parse_delimited_rows(content: str, delimiter: str) -> Optional[List[List[str]]]:
    lines = [line for line in content.splitlines() if line.strip()]
    if len(lines) < 2:
        return None

    reader = csv.reader(io.StringIO("\n".join(lines)), delimiter=delimiter)
    rows = list(reader)
    if len(rows) < 2:
        return None

    width = len(rows[0])
    if width < 2:
        return None

    if any(len(row) != width for row in rows):
        return None

    return rows


def rows_to_objects_or_arrays(rows: List[List[str]]) -> Any:
    header = rows[0]
    data_rows = rows[1:]
    if len(set(header)) == len(header) and all(col.strip() for col in header):
        return [dict(zip(header, row)) for row in data_rows]
    return rows


def split_markdown_table_row(line: str) -> List[str]:
    stripped = line.strip()
    if stripped.startswith("|"):
        stripped = stripped[1:]
    if stripped.endswith("|"):
        stripped = stripped[:-1]
    return [cell.strip() for cell in stripped.split("|")]


def is_markdown_separator_row(cells: List[str]) -> bool:
    if len(cells) < 2:
        return False
    for cell in cells:
        if not re.fullmatch(r":?-{3,}:?", cell.strip()):
            return False
    return True
