import re
from typing import Any, Dict, List, Optional

from format_detection_core import (
    PYTHON_LANGUAGE,
    ParserAttempt,
    _compact_tree_text,
    _iter_named_descendants,
    _normalize_comment_text,
    _tree_sitter_node_text,
    _try_tree_sitter_source,
)
from preprocess import preprocess_data_for_ai as preprocess_preview


def looks_like_python_source(content: str) -> bool:
    snippet = content[:12000]
    python_signals = [
        r"^\s*from\s+[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*\s+import\s+",
        r"^\s*import\s+[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*(?:\s+as\s+[A-Za-z_]\w*)?",
        r"^\s*def\s+[A-Za-z_]\w*\s*\(",
        r"^\s*class\s+[A-Za-z_]\w*(?:\([^)]*\))?\s*:",
        r"^\s*@[\w\.]+\s*(?:\([^)]*\))?\s*$",
        r'^\s*if\s+__name__\s*==\s*[\'"]__main__[\'"]\s*:',
    ]
    return any(
        re.search(pattern, snippet, flags=re.MULTILINE) is not None
        for pattern in python_signals
    )


def _extract_python_parameter_summaries(node: Any, source_bytes: bytes) -> List[str]:
    if node is None or node.type != "parameters":
        return []
    return [
        _compact_tree_text(_tree_sitter_node_text(child, source_bytes))
        for child in getattr(node, "named_children", [])
    ]


def _summarize_python_assignment(node: Any, source_bytes: bytes) -> Dict[str, Any]:
    named_children = list(getattr(node, "named_children", []))
    target = named_children[0] if named_children else None
    declared_names = []
    if target is not None:
        declared_names.append(
            _compact_tree_text(_tree_sitter_node_text(target, source_bytes))
        )
    return {
        "line": node.start_point.row + 1,
        "text": _compact_tree_text(_tree_sitter_node_text(node, source_bytes)),
        "declared_names": declared_names,
    }


def _extract_python_call_target(node: Any, source_bytes: bytes) -> str:
    if node is None:
        return ""
    return _compact_tree_text(_tree_sitter_node_text(node, source_bytes))


def _collect_python_calls(node: Any, source_bytes: bytes) -> List[Dict[str, Any]]:
    calls: List[Dict[str, Any]] = []
    for descendant in _iter_named_descendants(node):
        if descendant.type != "call":
            continue
        named_children = list(getattr(descendant, "named_children", []))
        callee_node = named_children[0] if named_children else None
        argument_node = next(
            (child for child in named_children if child.type == "argument_list"),
            None,
        )
        arguments = []
        if argument_node is not None:
            arguments = [
                _compact_tree_text(_tree_sitter_node_text(child, source_bytes))
                for child in getattr(argument_node, "named_children", [])
            ]
        calls.append(
            {
                "line": descendant.start_point.row + 1,
                "callee": _extract_python_call_target(callee_node, source_bytes),
                "arguments": arguments,
            }
        )
    return calls


def _summarize_python_function(
    node: Any, source_bytes: bytes, comments: List[str]
) -> Dict[str, Any]:
    named_children = list(getattr(node, "named_children", []))
    name_node = next(
        (child for child in named_children if child.type == "identifier"), None
    )
    parameter_node = next(
        (child for child in named_children if child.type == "parameters"), None
    )
    body = next((child for child in named_children if child.type == "block"), None)

    locals_summary: List[Dict[str, Any]] = []
    loops: List[Dict[str, Any]] = []
    conditionals: List[Dict[str, Any]] = []
    calls: List[Dict[str, Any]] = []
    if body is not None:
        for descendant in _iter_named_descendants(body):
            if descendant.type in {"assignment", "augmented_assignment"}:
                locals_summary.append(
                    _summarize_python_assignment(descendant, source_bytes)
                )
            elif descendant.type in {"for_statement", "while_statement"}:
                loops.append(
                    {
                        "line": descendant.start_point.row + 1,
                        "type": descendant.type,
                        "text": _compact_tree_text(
                            _tree_sitter_node_text(descendant, source_bytes),
                            max_length=140,
                        ),
                    }
                )
            elif descendant.type == "if_statement":
                conditionals.append(
                    {
                        "line": descendant.start_point.row + 1,
                        "type": descendant.type,
                        "text": _compact_tree_text(
                            _tree_sitter_node_text(descendant, source_bytes),
                            max_length=140,
                        ),
                    }
                )
        calls = _collect_python_calls(body, source_bytes)

    return {
        "line": node.start_point.row + 1,
        "name": (
            _tree_sitter_node_text(name_node, source_bytes)
            if name_node is not None
            else None
        ),
        "signature": _compact_tree_text(
            _tree_sitter_node_text(node, source_bytes).split(":", 1)[0]
        ),
        "parameters": _extract_python_parameter_summaries(parameter_node, source_bytes),
        "comments": comments,
        "locals": locals_summary,
        "calls": calls,
        "loops": loops,
        "conditionals": conditionals,
    }


def _summarize_python_class(
    node: Any, source_bytes: bytes, comments: List[str]
) -> Dict[str, Any]:
    name = next(
        (
            _tree_sitter_node_text(child, source_bytes)
            for child in getattr(node, "named_children", [])
            if child.type == "identifier"
        ),
        None,
    )
    block = next(
        (
            child
            for child in getattr(node, "named_children", [])
            if child.type == "block"
        ),
        None,
    )
    methods: List[Dict[str, Any]] = []
    pending_comments: List[str] = []
    if block is not None:
        for child in getattr(block, "named_children", []):
            if child.type == "comment":
                pending_comments.append(
                    _normalize_comment_text(_tree_sitter_node_text(child, source_bytes))
                )
                continue
            if child.type == "function_definition":
                methods.append(
                    _summarize_python_function(child, source_bytes, pending_comments)
                )
                pending_comments = []
                continue
            pending_comments = []
    return {
        "line": node.start_point.row + 1,
        "kind": "class",
        "name": name,
        "comments": comments,
        "methods": methods,
    }


def _summarize_python_module(
    root: Any, source_bytes: bytes, counts: Dict[str, int]
) -> Dict[str, Any]:
    imports: List[str] = []
    classes: List[Dict[str, Any]] = []
    functions: List[Dict[str, Any]] = []
    orphan_comments: List[str] = []
    pending_comments: List[str] = []

    for child in getattr(root, "named_children", []):
        if child.type == "comment":
            pending_comments.append(
                _normalize_comment_text(_tree_sitter_node_text(child, source_bytes))
            )
            continue
        if child.type in {"import_statement", "import_from_statement"}:
            imports.append(
                _compact_tree_text(_tree_sitter_node_text(child, source_bytes))
            )
            continue
        if child.type == "class_definition":
            classes.append(
                _summarize_python_class(child, source_bytes, pending_comments)
            )
            pending_comments = []
            continue
        if child.type == "function_definition":
            functions.append(
                _summarize_python_function(child, source_bytes, pending_comments)
            )
            pending_comments = []
            continue
        if pending_comments:
            orphan_comments.extend(pending_comments)
            pending_comments = []

    if pending_comments:
        orphan_comments.extend(pending_comments)

    summary: Dict[str, Any] = {
        "language": "python",
        "representation": "summary",
        "root_type": root.type,
        "node_counts": counts,
        "imports": imports,
        "classes": classes,
        "functions": functions,
    }
    if orphan_comments:
        summary["orphan_comments"] = orphan_comments
    return summary


def parse_data(content: str) -> Optional[ParserAttempt]:
    return _try_tree_sitter_source(
        content=content,
        language=PYTHON_LANGUAGE,
        detector=looks_like_python_source,
        expected_root_type="module",
        required_top_level_types={
            "import_statement",
            "import_from_statement",
            "class_definition",
            "function_definition",
        },
        format_name="python_source",
        parser_name="tree-sitter-python",
        summarizer=_summarize_python_module,
    )


def preprocess_data_for_ai(
    parsed_file: Any,
    preprocess_options: Optional[Dict[str, Any]] = None,
) -> Any:
    del preprocess_options
    return preprocess_preview(parsed_file)
