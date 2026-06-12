import re
from dataclasses import dataclass
from datetime import date, datetime, time
from typing import Any, Callable, Dict, List, Optional

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


def _get_extension(file_name: str) -> str:
    if not isinstance(file_name, str):
        return ''
    file_name = file_name.strip().lower()
    if '.' not in file_name:
        return ''
    return file_name.rsplit('.', 1)[1]


def _tree_sitter_node_text(node: Any, source_bytes: bytes) -> str:
    return source_bytes[node.start_byte : node.end_byte].decode('utf-8', errors='replace')


def _compact_tree_text(text: str, max_length: int = 200) -> str:
    compact = re.sub(r'\s+', ' ', text.strip())
    if len(compact) <= max_length:
        return compact
    return compact[: max_length - 3] + '...'


def _normalize_comment_text(text: str) -> str:
    normalized = text.strip()
    if normalized.startswith('#'):
        return normalized[1:].strip()
    if normalized.startswith('///'):
        return normalized[3:].strip()
    if normalized.startswith('//'):
        return normalized[2:].strip()
    if normalized.startswith('/*') and normalized.endswith('*/'):
        normalized = normalized[2:-2]
    normalized = re.sub(r'^\s*\*\s?', '', normalized, flags=re.MULTILINE)
    return normalized.strip()


def _iter_named_descendants(node: Any):
    for child in getattr(node, 'named_children', []):
        yield child
        yield from _iter_named_descendants(child)


def _coerce_literal(text: str) -> Any:
    stripped = text.strip()
    if len(stripped) >= 2 and stripped[0] == stripped[-1] and stripped[0] in {'"', "'"}:
        return stripped[1:-1]
    if re.fullmatch(r'-?\d+', stripped):
        try:
            return int(stripped)
        except Exception:
            return stripped
    if re.fullmatch(r'-?\d+\.\d+(?:[eE][+-]?\d+)?', stripped):
        try:
            return float(stripped)
        except Exception:
            return stripped
    return stripped


def _count_tree_sitter_nodes(node: Any) -> Dict[str, int]:
    named_nodes = 1 if getattr(node, 'is_named', False) else 0
    error_nodes = 1 if node.type == 'ERROR' or getattr(node, 'is_error', False) else 0
    total_nodes = 1

    for child in getattr(node, 'children', []):
        child_counts = _count_tree_sitter_nodes(child)
        named_nodes += child_counts['named']
        error_nodes += child_counts['error']
        total_nodes += child_counts['total']

    return {'named': named_nodes, 'error': error_nodes, 'total': total_nodes}


def _serialize_tree_sitter_node(
    node: Any,
    source_bytes: bytes,
    *,
    depth: int = 0,
    max_depth: int = 6,
    max_children: int = 24,
    text_limit: int = 160,
) -> Dict[str, Any]:
    serialized: Dict[str, Any] = {
        'type': node.type,
        'start_line': node.start_point.row + 1,
        'start_column': node.start_point.column,
        'end_line': node.end_point.row + 1,
        'end_column': node.end_point.column,
        'named': bool(getattr(node, 'is_named', False)),
        'error': bool(node.type == 'ERROR' or getattr(node, 'is_error', False)),
    }

    named_children = list(getattr(node, 'named_children', []))
    if len(named_children) == 0:
        text = _compact_tree_text(_tree_sitter_node_text(node, source_bytes), max_length=text_limit)
        if text:
            serialized['text'] = text
        return serialized

    serialized['child_count'] = len(named_children)
    if depth >= max_depth:
        serialized['truncated'] = True
        serialized['preview'] = _compact_tree_text(
            _tree_sitter_node_text(node, source_bytes),
            max_length=text_limit,
        )
        return serialized

    children = [
        _serialize_tree_sitter_node(
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
                'type': '__truncated_children__',
                'remaining': len(named_children) - max_children,
            }
        )
    serialized['children'] = children
    return serialized


def _try_tree_sitter_source(
    *,
    content: str,
    language: Any,
    detector: Callable[[str], bool],
    expected_root_type: str,
    required_top_level_types: set[str],
    format_name: str,
    parser_name: str,
    summarizer: Callable[[Any, bytes, Dict[str, int]], Dict[str, Any]],
) -> Optional[ParserAttempt]:
    if language is None or Parser is None:
        return None
    if not detector(content):
        return None

    source_bytes = content.encode('utf-8', errors='replace')
    try:
        parser = Parser(language)
        tree = parser.parse(source_bytes)
    except Exception:
        return None

    root = tree.root_node
    if root is None or root.type != expected_root_type:
        return None

    counts = _count_tree_sitter_nodes(root)
    if counts['named'] < 2:
        return None
    if counts['error'] > max(3, counts['named'] // 2):
        return None

    top_level_types = {child.type for child in getattr(root, 'named_children', [])}
    if required_top_level_types and not (top_level_types & required_top_level_types):
        return None

    return ParserAttempt(
        format=format_name,
        parsed_json=summarizer(root, source_bytes, counts),
        parser_name=parser_name,
    )


def _to_json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): _to_json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_json_safe(v) for v in value]
    if isinstance(value, tuple):
        return [_to_json_safe(v) for v in value]
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)

