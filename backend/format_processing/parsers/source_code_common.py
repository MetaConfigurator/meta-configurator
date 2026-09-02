"""Summarization helpers shared by the tree-sitter based source code parsers."""

from typing import Any, Callable, Collection, Dict, Iterator, List, Optional, Tuple

from format_detection_core import (
    compact_tree_text,
    find_first_named_child,
    get_tree_sitter_node_text,
    iterate_named_descendants,
    normalize_comment_text,
    serialize_tree_sitter_node,
    summarize_tree_sitter_node,
)

SummarizeNodeFunction = Callable[[Any, bytes], Dict[str, Any]]
CollectCallsFunction = Callable[[Any, bytes], List[Dict[str, Any]]]


def iterate_named_children_with_comments(
    node: Any, source_bytes: bytes
) -> Iterator[Tuple[Optional[Any], List[str]]]:
    """Yields each named child that is not a comment together with the comment lines
    directly above it. A final (None, comments) pair carries the trailing comments."""
    pending_comments: List[str] = []
    for child in getattr(node, "named_children", []):
        if child.type == "comment":
            pending_comments.append(
                normalize_comment_text(get_tree_sitter_node_text(child, source_bytes))
            )
            continue
        yield child, pending_comments
        pending_comments = []
    if pending_comments:
        yield None, pending_comments


def get_first_named_child_text(
    node: Any, source_bytes: bytes, child_types: Collection[str]
) -> Optional[str]:
    child = find_first_named_child(node, child_types)
    return (
        get_tree_sitter_node_text(child, source_bytes) if child is not None else None
    )


def collect_calls_from_descendants(
    node: Any,
    source_bytes: bytes,
    *,
    call_types: Collection[str],
    extract_callee: Callable[[Any, bytes], str],
    argument_list_type: str = "argument_list",
) -> List[Dict[str, Any]]:
    calls: List[Dict[str, Any]] = []
    for descendant in iterate_named_descendants(node):
        if descendant.type not in call_types:
            continue
        argument_node = find_first_named_child(descendant, {argument_list_type})
        calls.append(
            {
                "line": descendant.start_point.row + 1,
                "callee": extract_callee(descendant, source_bytes),
                "arguments": extract_compact_argument_texts(argument_node, source_bytes),
            }
        )
    return calls


def extract_compact_argument_texts(node: Any, source_bytes: bytes) -> List[str]:
    if node is None:
        return []
    return [
        compact_tree_text(get_tree_sitter_node_text(child, source_bytes))
        for child in getattr(node, "named_children", [])
    ]


def summarize_callable_body(
    body: Any,
    source_bytes: bytes,
    *,
    declaration_types: Collection[str],
    loop_types: Collection[str],
    conditional_types: Collection[str],
    summarize_declaration: SummarizeNodeFunction,
    collect_calls: CollectCallsFunction,
) -> Dict[str, Any]:
    """Summarizes the local declarations, calls, loops and conditionals of a body."""
    declarations: List[Dict[str, Any]] = []
    loops: List[Dict[str, Any]] = []
    conditionals: List[Dict[str, Any]] = []

    if body is not None:
        for descendant in iterate_named_descendants(body):
            if descendant.type in declaration_types:
                declarations.append(summarize_declaration(descendant, source_bytes))
            elif descendant.type in loop_types:
                loops.append(summarize_tree_sitter_node(descendant, source_bytes))
            elif descendant.type in conditional_types:
                conditionals.append(summarize_tree_sitter_node(descendant, source_bytes))

    return {
        "locals": declarations,
        "calls": collect_calls(body, source_bytes) if body is not None else [],
        "loops": loops,
        "conditionals": conditionals,
    }


def summarize_class_like_node(
    node: Any,
    source_bytes: bytes,
    comments: List[str],
    *,
    kind: str,
    body_types: Collection[str],
    method_types: Collection[str],
    summarize_method: Callable[[Any, bytes, List[str]], Optional[Dict[str, Any]]],
    name_types: Collection[str] = ("identifier",),
) -> Dict[str, Any]:
    """Summarizes a class-like declaration together with the methods in its body."""
    body = find_first_named_child(node, body_types)
    methods: List[Dict[str, Any]] = []
    if body is not None:
        for child, method_comments in iterate_named_children_with_comments(
            body, source_bytes
        ):
            if child is not None and child.type in method_types:
                method_summary = summarize_method(child, source_bytes, method_comments)
                if method_summary is not None:
                    methods.append(method_summary)

    return {
        "line": node.start_point.row + 1,
        "kind": kind,
        "name": get_first_named_child_text(node, source_bytes, name_types),
        "comments": comments,
        "methods": methods,
    }


def build_source_code_summary(
    root_node: Any,
    source_bytes: bytes,
    node_counts: Dict[str, int],
    *,
    language: str,
    summary: Dict[str, Any],
    orphan_comments: List[str],
) -> Dict[str, Any]:
    """Wraps a language specific summary into the envelope every source parser returns."""
    if orphan_comments:
        summary = {**summary, "orphan_comments": orphan_comments}
    return {
        "language": language,
        "representation": "syntax_tree_with_summary",
        "root_type": root_node.type,
        "node_counts": node_counts,
        "syntax_tree": serialize_tree_sitter_node(root_node, source_bytes),
        "summary": summary,
    }
