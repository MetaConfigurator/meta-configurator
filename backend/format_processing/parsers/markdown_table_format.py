from typing import List, Optional

from format_detection_core import ParserAttempt
from parsers.common_preprocess import preprocess_data_for_ai
from parsers.tabular_utils import (
    is_markdown_separator_row,
    rows_to_objects_or_arrays,
    split_markdown_table_row,
)


def parse_data(content: str) -> Optional[ParserAttempt]:
    lines = [line.rstrip() for line in content.splitlines()]
    for index in range(len(lines) - 2):
        header_line = lines[index].strip()
        separator_line = lines[index + 1].strip()
        if '|' not in header_line or '|' not in separator_line:
            continue

        header_cells = split_markdown_table_row(header_line)
        separator_cells = split_markdown_table_row(separator_line)
        if len(header_cells) < 2 or len(header_cells) != len(separator_cells):
            continue
        if not is_markdown_separator_row(separator_cells):
            continue

        data_lines: List[str] = []
        cursor = index + 2
        while cursor < len(lines):
            candidate = lines[cursor].strip()
            if not candidate or '|' not in candidate:
                break
            candidate_cells = split_markdown_table_row(candidate)
            if len(candidate_cells) != len(header_cells):
                break
            data_lines.append(candidate)
            cursor += 1

        if len(data_lines) == 0:
            continue

        rows = [header_cells, *[split_markdown_table_row(line) for line in data_lines]]
        return ParserAttempt(
            format='markdown_table',
            parsed_json=rows_to_objects_or_arrays(rows),
            parser_name='markdown-table-parser',
        )

    return None

