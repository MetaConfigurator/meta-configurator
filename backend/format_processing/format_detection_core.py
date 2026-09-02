import ast
import re
from dataclasses import dataclass
from datetime import date, datetime, time
from typing import Any, Callable, Collection, Dict, List, Optional, Sequence

try:
    import yaml
except ModuleNotFoundError:  # pragma: no cover
    yaml = None

try:
    import xmltodict
except ModuleNotFoundError:  # pragma: no cover
    xmltodict = None

try:
    import gemmi
except ModuleNotFoundError:  # pragma: no cover
    gemmi = None

try:
    import rdflib
except ModuleNotFoundError:  # pragma: no cover
    rdflib = None

try:
    from tree_sitter import Language, Parser
except ModuleNotFoundError:  # pragma: no cover
    Language = None
    Parser = None

try:
    import tree_sitter_cpp as tree_sitter_cpp
except ModuleNotFoundError:  # pragma: no cover
    tree_sitter_cpp = None

try:
    import tree_sitter_python as tree_sitter_python
except ModuleNotFoundError:  # pragma: no cover
    tree_sitter_python = None

try:
    import tree_sitter_java as tree_sitter_java
except ModuleNotFoundError:  # pragma: no cover
    tree_sitter_java = None


CPP_LANGUAGE = (
    Language(tree_sitter_cpp.language())
    if Language is not None and tree_sitter_cpp is not None
    else None
)
PYTHON_LANGUAGE = (
    Language(tree_sitter_python.language())
    if Language is not None and tree_sitter_python is not None
    else None
)
JAVA_LANGUAGE = (
    Language(tree_sitter_java.language())
    if Language is not None and tree_sitter_java is not None
    else None
)


@dataclass
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


def matches_source_patterns(
    content: str,
    source_patterns: Sequence[str],
    *,
    maximum_characters: int = 12000,
) -> bool:
    content_prefix = content[:maximum_characters]
    return any(
        re.search(pattern, content_prefix, flags=re.MULTILINE) is not None
        for pattern in source_patterns
    )


def get_tree_sitter_node_text(node: Any, source_bytes: bytes) -> str:
    return source_bytes[node.start_byte : node.end_byte].decode(
        "utf-8", errors="replace"
    )


def find_first_named_child(
    parent_node: Any,
    child_types: Collection[str],
) -> Optional[Any]:
    return next(
        (
            child_node
            for child_node in getattr(parent_node, "named_children", [])
            if child_node.type in child_types
        ),
        None,
    )


def compact_tree_text(text: str, max_length: int = 200) -> str:
    compact = re.sub(r"\s+", " ", text.strip())
    if len(compact) <= max_length:
        return compact
    return compact[: max_length - 3] + "..."


def extract_compact_named_child_texts(
    parent_node: Any,
    source_bytes: bytes,
    *,
    included_child_types: Optional[Collection[str]] = None,
) -> List[str]:
    if parent_node is None:
        return []
    return [
        compact_tree_text(get_tree_sitter_node_text(child_node, source_bytes))
        for child_node in getattr(parent_node, "named_children", [])
        if included_child_types is None or child_node.type in included_child_types
    ]


def summarize_tree_sitter_node(
    node: Any,
    source_bytes: bytes,
    *,
    text_limit: int = 140,
) -> Dict[str, Any]:
    return {
        "line": node.start_point.row + 1,
        "type": node.type,
        "text": compact_tree_text(
            get_tree_sitter_node_text(node, source_bytes),
            max_length=text_limit,
        ),
    }


def normalize_comment_text(text: str) -> str:
    normalized = text.strip()
    if normalized.startswith("#"):
        return normalized[1:].strip()
    if normalized.startswith("///"):
        return normalized[3:].strip()
    if normalized.startswith("//"):
        return normalized[2:].strip()
    if normalized.startswith("/*") and normalized.endswith("*/"):
        normalized = normalized[2:-2]
    normalized = re.sub(r"^\s*\*\s?", "", normalized, flags=re.MULTILINE)
    return normalized.strip()


def iterate_named_descendants(node: Any):
    for child in getattr(node, "named_children", []):
        yield child
        yield from iterate_named_descendants(child)


def coerce_literal(text: str) -> Any:
    """Turn source-literal text into the matching Python value, else the plain text."""
    stripped_text = text.strip()
    try:
        return ast.literal_eval(stripped_text)
    except (ValueError, SyntaxError, MemoryError, RecursionError):
        return stripped_text


def _count_tree_sitter_nodes(node: Any) -> Dict[str, int]:
    named_nodes = 1 if getattr(node, "is_named", False) else 0
    error_nodes = 1 if node.type == "ERROR" or getattr(node, "is_error", False) else 0
    total_nodes = 1

    for child in getattr(node, "children", []):
        child_counts = _count_tree_sitter_nodes(child)
        named_nodes += child_counts["named"]
        error_nodes += child_counts["error"]
        total_nodes += child_counts["total"]

    return {"named": named_nodes, "error": error_nodes, "total": total_nodes}


def serialize_tree_sitter_node(
    node: Any,
    source_bytes: bytes,
    *,
    depth: int = 0,
    max_depth: int = 6,
    max_children: int = 24,
    text_limit: int = 160,
) -> Dict[str, Any]:
    serialized: Dict[str, Any] = {
        "type": node.type,
        "start_line": node.start_point.row + 1,
        "start_column": node.start_point.column,
        "end_line": node.end_point.row + 1,
        "end_column": node.end_point.column,
        "named": bool(getattr(node, "is_named", False)),
        "error": bool(node.type == "ERROR" or getattr(node, "is_error", False)),
    }

    named_children = list(getattr(node, "named_children", []))
    if len(named_children) == 0:
        text = compact_tree_text(
            get_tree_sitter_node_text(node, source_bytes), max_length=text_limit
        )
        if text:
            serialized["text"] = text
        return serialized

    serialized["child_count"] = len(named_children)
    if depth >= max_depth:
        serialized["truncated"] = True
        serialized["preview"] = compact_tree_text(
            get_tree_sitter_node_text(node, source_bytes),
            max_length=text_limit,
        )
        return serialized

    children = [
        serialize_tree_sitter_node(
            child,
            source_bytes,
            depth=depth + 1,
            max_depth=max_depth,
            max_children=max_children,
            text_limit=text_limit,
        )
        for child in named_children[:max_children]
    ]
    if len(named_children) > max_children:
        children.append(
            {
                "type": "__truncated_children__",
                "remaining": len(named_children) - max_children,
            }
        )
    serialized["children"] = children
    return serialized


def try_parse_with_tree_sitter(
    *,
    content: str,
    language: Any,
    detector: Callable[[str], bool],
    expected_root_type: str,
    required_top_level_types: set[str],
    format_name: str,
    parser_name: str,
    summarizer: Callable[[Any, bytes, Dict[str, int]], Dict[str, Any]],
    minimum_named_nodes: int = 2,
) -> Optional[ParserAttempt]:
    if language is None or Parser is None:
        return None
    if not detector(content):
        return None

    source_bytes = content.encode("utf-8", errors="replace")
    try:
        parser = Parser(language)
        tree = parser.parse(source_bytes)
    except Exception:
        return None

    root_node = tree.root_node
    if root_node is None or root_node.type != expected_root_type:
        return None

    node_counts = _count_tree_sitter_nodes(root_node)
    if node_counts["named"] < minimum_named_nodes:
        return None
    if node_counts["error"] > max(3, node_counts["named"] // 2):
        return None

    top_level_types = {
        child.type for child in getattr(root_node, "named_children", [])
    }
    if required_top_level_types and not (top_level_types & required_top_level_types):
        return None

    return ParserAttempt(
        format=format_name,
        parsed_json=summarizer(root_node, source_bytes, node_counts),
        parser_name=parser_name,
    )


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
