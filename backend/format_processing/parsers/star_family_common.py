import json
import re
import shlex
from typing import Any, Dict, List, Optional

from format_detection_core import gemmi


_CIF_TAG_PATTERNS = [
    re.compile(
        r"^\s*_(?:audit|atom_site|cell|chemical|database|diffrn|entity|exptl|publ|refine|space_group|struct|symmetry)[_.]",
        re.MULTILINE,
    ),
    re.compile(
        r"^\s*_(?:audit|atom_site|cell|chemical|database|diffrn|entity|exptl|publ|refine|space_group|struct|symmetry)_",
        re.MULTILINE,
    ),
]


def normalize_star_family_input(content: str) -> str:
    source_lines = content.splitlines()
    normalized_lines: List[str] = []

    def quote_if_needed(token: str) -> str:
        if token in {"?", "."}:
            return token
        if token == "":
            return "''"
        if re.search(r"\s", token):
            return "'" + token.replace("'", "\\'") + "'"
        return token

    def split_loop_row_with_tab_support(raw: str) -> List[str]:
        if "\t" not in raw:
            try:
                return shlex.split(raw, posix=True)
            except Exception:
                return raw.split()

        tokens: List[str] = []
        for segment in raw.split("\t"):
            stripped = segment.strip()
            if stripped == "":
                tokens.append("")
                continue
            try:
                segment_tokens = shlex.split(stripped, posix=True)
            except Exception:
                segment_tokens = stripped.split()

            if len(segment_tokens) == 0:
                tokens.append("")
            else:
                tokens.extend(segment_tokens)
        return tokens

    def process_loop_row(raw: str, column_count: int) -> str:
        tokens = split_loop_row_with_tab_support(raw)
        if len(tokens) > column_count:
            head = tokens[: column_count - 1]
            tail = " ".join(tokens[column_count - 1 :])
            tokens = [*head, tail]

        if len(tokens) != column_count:
            return raw

        return " ".join(quote_if_needed(token) for token in tokens)

    i = 0
    while i < len(source_lines):
        raw_line = source_lines[i]
        stripped = raw_line.strip()
        if stripped.startswith("data_"):
            block_name = re.sub(r"\s+", "_", stripped[5:].strip())
            normalized_lines.append(f"data_{block_name}")
            i += 1
            continue
        if stripped.startswith("_"):
            parts = stripped.split(None, 1)
            if len(parts) == 1:
                next_stripped = (
                    source_lines[i + 1].strip() if i + 1 < len(source_lines) else ""
                )
                if next_stripped != ";":
                    normalized_lines.append(f"{parts[0]} ?")
                    i += 1
                    continue
        if stripped == "loop_":
            normalized_lines.append("loop_")
            i += 1

            loop_headers: List[str] = []
            while i < len(source_lines):
                header_line = source_lines[i]
                header_stripped = header_line.strip()
                if header_stripped.startswith("_"):
                    loop_headers.append(header_stripped)
                    normalized_lines.append(header_stripped)
                    i += 1
                    continue
                break

            if not loop_headers:
                continue

            while i < len(source_lines):
                row_line = source_lines[i]
                row_stripped = row_line.strip()
                if row_stripped == "" or row_stripped.startswith("#"):
                    normalized_lines.append(row_line)
                    i += 1
                    continue
                if (
                    row_stripped.startswith("_")
                    or row_stripped == "loop_"
                    or row_stripped.startswith("data_")
                ):
                    break
                if row_stripped == ";":
                    break

                normalized_lines.append(
                    process_loop_row(row_stripped, len(loop_headers))
                )
                i += 1
            continue
        normalized_lines.append(raw_line)
        i += 1

    return "\n".join(normalized_lines)


def parse_star_document(content: str) -> Optional[Any]:
    if gemmi is None:
        return None

    snippet = content[:2000]
    if not ("data_" in snippet or "loop_" in snippet or "save_" in snippet):
        return None

    try:
        return gemmi.cif.read_string(content)
    except Exception:
        return None


def looks_like_cif(content: str) -> bool:
    snippet = content[:12000]
    matches = sum(1 for pattern in _CIF_TAG_PATTERNS if pattern.search(snippet))
    return matches > 0


def parse_star_family_document(content: str) -> Optional[tuple[Any, str]]:
    doc = parse_star_document(content)
    parser_name = "gemmi-star-family"
    if doc is None:
        normalized_content = normalize_star_family_input(content)
        doc = parse_star_document(normalized_content)
        parser_name = "gemmi-star-family (normalized)"
    if doc is None or len(doc) == 0:
        return None
    return doc, parser_name


def document_to_gemmi_json(doc: Any) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(doc.as_json(lowercase_names=False))
    except Exception:
        return None
