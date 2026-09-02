from typing import Any, Dict, List, Optional

from format_detection_core import (
    PYTHON_LANGUAGE,
    ParserAttempt,
    compact_tree_text,
    find_first_named_child,
    matches_source_patterns,
    get_tree_sitter_node_text,
    try_parse_with_tree_sitter,
)
from parsers.source_code_common import (
    build_source_code_summary,
    collect_calls_from_descendants,
    extract_compact_argument_texts,
    iterate_named_children_with_comments,
    summarize_callable_body,
    summarize_class_like_node,
)

LOOP_TYPES = {"for_statement", "while_statement"}
CONDITIONAL_TYPES = {"if_statement"}
ASSIGNMENT_TYPES = {"assignment", "augmented_assignment"}
IMPORT_TYPES = {"import_statement", "import_from_statement"}


def looks_like_python_source(content: str) -> bool:
    return matches_source_patterns(
        content,
        [
            r"^\s*from\s+[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*\s+import\s+",
            (
                r"^\s*import\s+[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*"
                r"(?:\s+as\s+[A-Za-z_]\w*)?"
            ),
            r"^\s*def\s+[A-Za-z_]\w*\s*\(",
            r"^\s*class\s+[A-Za-z_]\w*(?:\([^)]*\))?\s*:",
            r"^\s*@[\w\.]+\s*(?:\([^)]*\))?\s*$",
            r'^\s*if\s+__name__\s*==\s*[\'"]__main__[\'"]\s*:',
        ],
    )


def _summarize_python_assignment(node: Any, source_bytes: bytes) -> Dict[str, Any]:
    assigned_target = next(iter(getattr(node, "named_children", [])), None)
    return {
        "line": node.start_point.row + 1,
        "text": compact_tree_text(get_tree_sitter_node_text(node, source_bytes)),
        "declared_names": (
            [compact_tree_text(get_tree_sitter_node_text(assigned_target, source_bytes))]
            if assigned_target is not None
            else []
        ),
    }


def _extract_python_call_target(node: Any, source_bytes: bytes) -> str:
    called_function = next(iter(getattr(node, "named_children", [])), None)
    if called_function is None:
        return ""
    return compact_tree_text(get_tree_sitter_node_text(called_function, source_bytes))


def _collect_python_calls(node: Any, source_bytes: bytes) -> List[Dict[str, Any]]:
    return collect_calls_from_descendants(
        node,
        source_bytes,
        call_types={"call"},
        extract_callee=_extract_python_call_target,
    )


def _summarize_python_function(
    node: Any, source_bytes: bytes, comments: List[str]
) -> Dict[str, Any]:
    name_node = find_first_named_child(node, {"identifier"})
    parameter_node = find_first_named_child(node, {"parameters"})

    return {
        "line": node.start_point.row + 1,
        "name": (
            get_tree_sitter_node_text(name_node, source_bytes)
            if name_node is not None
            else None
        ),
        "signature": compact_tree_text(
            get_tree_sitter_node_text(node, source_bytes).split(":", 1)[0]
        ),
        "parameters": extract_compact_argument_texts(parameter_node, source_bytes),
        "comments": comments,
        **summarize_callable_body(
            find_first_named_child(node, {"block"}),
            source_bytes,
            declaration_types=ASSIGNMENT_TYPES,
            loop_types=LOOP_TYPES,
            conditional_types=CONDITIONAL_TYPES,
            summarize_declaration=_summarize_python_assignment,
            collect_calls=_collect_python_calls,
        ),
    }


def _summarize_python_class(
    node: Any, source_bytes: bytes, comments: List[str]
) -> Dict[str, Any]:
    return summarize_class_like_node(
        node,
        source_bytes,
        comments,
        kind="class",
        body_types={"block"},
        method_types={"function_definition"},
        summarize_method=_summarize_python_function,
    )


def _summarize_python_module(
    root_node: Any,
    source_bytes: bytes,
    node_counts: Dict[str, int],
) -> Dict[str, Any]:
    imports: List[str] = []
    classes: List[Dict[str, Any]] = []
    functions: List[Dict[str, Any]] = []
    orphan_comments: List[str] = []

    for child, comments in iterate_named_children_with_comments(root_node, source_bytes):
        if child is None:
            orphan_comments.extend(comments)
            continue
        if child.type in IMPORT_TYPES:
            imports.append(
                compact_tree_text(get_tree_sitter_node_text(child, source_bytes))
            )
        elif child.type == "class_definition":
            classes.append(_summarize_python_class(child, source_bytes, comments))
        elif child.type == "function_definition":
            functions.append(_summarize_python_function(child, source_bytes, comments))
        else:
            orphan_comments.extend(comments)

    return build_source_code_summary(
        root_node,
        source_bytes,
        node_counts,
        language="python",
        summary={"imports": imports, "classes": classes, "functions": functions},
        orphan_comments=orphan_comments,
    )


def parse_data(content: str) -> Optional[ParserAttempt]:
    return try_parse_with_tree_sitter(
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
