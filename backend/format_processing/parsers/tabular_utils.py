import csv
import io
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
