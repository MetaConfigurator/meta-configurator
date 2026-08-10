import re
from typing import Any, Dict, List, Optional

from format_detection_core import (
    JAVA_LANGUAGE,
    ParserAttempt,
    _compact_tree_text,
    _iter_named_descendants,
    _normalize_comment_text,
    _serialize_tree_sitter_node,
    _tree_sitter_node_text,
    _try_tree_sitter_source,
)
from preprocess import preprocess_data_for_ai as preprocess_preview


def looks_like_java_source(content: str) -> bool:
    snippet = content[:12000]
    java_signals = [
        r"^\s*package\s+[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*\s*;",
        r"^\s*import\s+(?:static\s+)?[A-Za-z_]\w*(?:\.[A-Za-z_*]\w*)*\s*;",
        r"\b(?:public|protected|private)?\s*(?:abstract\s+|final\s+)?class\s+[A-Za-z_]\w*",
        r"\b(?:public|protected|private)?\s*(?:abstract\s+)?interface\s+[A-Za-z_]\w*",
        r"\b(?:public|protected|private)?\s*enum\s+[A-Za-z_]\w*",
        r"\bpublic\s+static\s+void\s+main\s*\(",
    ]
    return any(
        re.search(pattern, snippet, flags=re.MULTILINE) is not None
        for pattern in java_signals
    )


def _extract_java_package(node: Any, source_bytes: bytes) -> Optional[str]:
    match = re.match(
        r"^\s*package\s+(.+?)\s*;\s*$",
        _tree_sitter_node_text(node, source_bytes),
        flags=re.DOTALL,
    )
    return match.group(1).strip() if match else None


def _extract_java_import(node: Any, source_bytes: bytes) -> Optional[str]:
    match = re.match(
        r"^\s*import\s+(.+?)\s*;\s*$",
        _tree_sitter_node_text(node, source_bytes),
        flags=re.DOTALL,
    )
    return match.group(1).strip() if match else None


def _extract_java_parameter_summaries(node: Any, source_bytes: bytes) -> List[str]:
    if node is None or node.type != "formal_parameters":
        return []
    return [
        _compact_tree_text(_tree_sitter_node_text(child, source_bytes))
        for child in getattr(node, "named_children", [])
        if child.type != ","
    ]


def _extract_java_declared_names(node: Any, source_bytes: bytes) -> List[str]:
    names: List[str] = []
    for descendant in _iter_named_descendants(node):
        if descendant.type == "variable_declarator":
            identifier = next(
                (
                    child
                    for child in getattr(descendant, "named_children", [])
                    if child.type == "identifier"
                ),
                None,
            )
            if identifier is not None:
                names.append(_tree_sitter_node_text(identifier, source_bytes))
    return names


def _summarize_java_declaration(node: Any, source_bytes: bytes) -> Dict[str, Any]:
    return {
        "line": node.start_point.row + 1,
        "text": _compact_tree_text(_tree_sitter_node_text(node, source_bytes)),
        "declared_names": _extract_java_declared_names(node, source_bytes),
    }


def _extract_java_call_target(node: Any, source_bytes: bytes) -> str:
    if node is None:
        return ""
    if node.type == "method_invocation":
        parts = [
            _tree_sitter_node_text(child, source_bytes)
            for child in getattr(node, "named_children", [])
            if child.type != "argument_list"
        ]
        return ".".join(parts)
    if node.type == "object_creation_expression":
        type_node = next(
            (
                child
                for child in getattr(node, "named_children", [])
                if child.type in {"type_identifier", "generic_type"}
            ),
            None,
        )
        if type_node is not None:
            return f"new {_tree_sitter_node_text(type_node, source_bytes)}"
    return _compact_tree_text(_tree_sitter_node_text(node, source_bytes))


def _collect_java_calls(node: Any, source_bytes: bytes) -> List[Dict[str, Any]]:
    calls: List[Dict[str, Any]] = []
    for descendant in _iter_named_descendants(node):
        if descendant.type not in {"method_invocation", "object_creation_expression"}:
            continue
        argument_node = next(
            (
                child
                for child in getattr(descendant, "named_children", [])
                if child.type == "argument_list"
            ),
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
                "callee": _extract_java_call_target(descendant, source_bytes),
                "arguments": arguments,
            }
        )
    return calls


def _summarize_java_method(
    node: Any, source_bytes: bytes, comments: List[str]
) -> Dict[str, Any]:
    named_children = list(getattr(node, "named_children", []))
    name_node = next(
        (child for child in named_children if child.type == "identifier"), None
    )
    parameter_node = next(
        (child for child in named_children if child.type == "formal_parameters"), None
    )
    body = next((child for child in named_children if child.type == "block"), None)
    return_type = " ".join(
        _compact_tree_text(_tree_sitter_node_text(child, source_bytes))
        for child in named_children
        if child not in {name_node, parameter_node, body}
    ).strip()

    locals_summary: List[Dict[str, Any]] = []
    loops: List[Dict[str, Any]] = []
    conditionals: List[Dict[str, Any]] = []
    calls: List[Dict[str, Any]] = []
    if body is not None:
        for descendant in _iter_named_descendants(body):
            if descendant.type == "local_variable_declaration":
                locals_summary.append(
                    _summarize_java_declaration(descendant, source_bytes)
                )
            elif descendant.type in {
                "for_statement",
                "enhanced_for_statement",
                "while_statement",
                "do_statement",
            }:
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
            elif descendant.type in {
                "if_statement",
                "switch_expression",
                "switch_statement",
            }:
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
        calls = _collect_java_calls(body, source_bytes)

    return {
        "line": node.start_point.row + 1,
        "name": (
            _tree_sitter_node_text(name_node, source_bytes)
            if name_node is not None
            else None
        ),
        "signature": _compact_tree_text(
            _tree_sitter_node_text(node, source_bytes).split("{", 1)[0]
        ),
        "return_type": return_type or None,
        "parameters": _extract_java_parameter_summaries(parameter_node, source_bytes),
        "comments": comments,
        "locals": locals_summary,
        "calls": calls,
        "loops": loops,
        "conditionals": conditionals,
    }


def _summarize_java_class(
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
    body = next(
        (
            child
            for child in getattr(node, "named_children", [])
            if child.type == "class_body"
        ),
        None,
    )
    methods: List[Dict[str, Any]] = []
    pending_comments: List[str] = []
    if body is not None:
        for child in getattr(body, "named_children", []):
            if child.type == "comment":
                pending_comments.append(
                    _normalize_comment_text(_tree_sitter_node_text(child, source_bytes))
                )
                continue
            if child.type in {"method_declaration", "constructor_declaration"}:
                methods.append(
                    _summarize_java_method(child, source_bytes, pending_comments)
                )
                pending_comments = []
                continue
            pending_comments = []
    return {
        "line": node.start_point.row + 1,
        "kind": node.type.replace("_declaration", ""),
        "name": name,
        "comments": comments,
        "methods": methods,
    }


def _summarize_java_program(
    root: Any, source_bytes: bytes, counts: Dict[str, int]
) -> Dict[str, Any]:
    package_name: Optional[str] = None
    imports: List[str] = []
    classes: List[Dict[str, Any]] = []
    orphan_comments: List[str] = []
    pending_comments: List[str] = []

    for child in getattr(root, "named_children", []):
        if child.type == "comment":
            pending_comments.append(
                _normalize_comment_text(_tree_sitter_node_text(child, source_bytes))
            )
            continue
        if child.type == "package_declaration":
            package_name = _extract_java_package(child, source_bytes)
            continue
        if child.type == "import_declaration":
            import_value = _extract_java_import(child, source_bytes)
            if import_value:
                imports.append(import_value)
            continue
        if child.type in {
            "class_declaration",
            "interface_declaration",
            "enum_declaration",
            "record_declaration",
        }:
            classes.append(_summarize_java_class(child, source_bytes, pending_comments))
            pending_comments = []
            continue
        if pending_comments:
            orphan_comments.extend(pending_comments)
            pending_comments = []

    if pending_comments:
        orphan_comments.extend(pending_comments)

    summary: Dict[str, Any] = {
        "language": "java",
        "representation": "syntax_tree_with_summary",
        "root_type": root.type,
        "node_counts": counts,
        "syntax_tree": _serialize_tree_sitter_node(root, source_bytes),
        "summary": {
            "package": package_name,
            "imports": imports,
            "classes": classes,
        },
    }
    if orphan_comments:
        summary["summary"]["orphan_comments"] = orphan_comments
    return summary


def parse_data(content: str) -> Optional[ParserAttempt]:
    return _try_tree_sitter_source(
        content=content,
        language=JAVA_LANGUAGE,
        detector=looks_like_java_source,
        expected_root_type="program",
        required_top_level_types={
            "package_declaration",
            "import_declaration",
            "class_declaration",
            "interface_declaration",
            "enum_declaration",
            "record_declaration",
        },
        format_name="java_source",
        parser_name="tree-sitter-java",
        summarizer=_summarize_java_program,
    )


def preprocess_data_for_ai(
    parsed_file: Any,
    preprocess_options: Optional[Dict[str, Any]] = None,
) -> Any:
    del preprocess_options
    return preprocess_preview(parsed_file)
