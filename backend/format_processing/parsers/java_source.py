import re
from typing import Any, Dict, List, Optional

from format_detection_core import (
    JAVA_LANGUAGE,
    ParserAttempt,
    compact_tree_text,
    find_first_named_child,
    iterate_named_descendants,
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

LOOP_TYPES = {
    "for_statement",
    "enhanced_for_statement",
    "while_statement",
    "do_statement",
}
CONDITIONAL_TYPES = {"if_statement", "switch_expression", "switch_statement"}
CALL_TYPES = {"method_invocation", "object_creation_expression"}
CLASS_LIKE_TYPES = {
    "class_declaration",
    "interface_declaration",
    "enum_declaration",
    "record_declaration",
}


def looks_like_java_source(content: str) -> bool:
    return matches_source_patterns(
        content,
        [
            r"^\s*package\s+[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*\s*;",
            r"^\s*import\s+(?:static\s+)?[A-Za-z_]\w*(?:\.[A-Za-z_*]\w*)*\s*;",
            (
                r"\b(?:public|protected|private)?\s*(?:abstract\s+|final\s+)?"
                r"class\s+[A-Za-z_]\w*"
            ),
            (
                r"\b(?:public|protected|private)?\s*(?:abstract\s+)?"
                r"interface\s+[A-Za-z_]\w*"
            ),
            r"\b(?:public|protected|private)?\s*enum\s+[A-Za-z_]\w*",
            r"\bpublic\s+static\s+void\s+main\s*\(",
        ],
    )


def _extract_statement_value(node: Any, source_bytes: bytes, keyword: str) -> Optional[str]:
    """Returns the value of a `<keyword> <value>;` statement such as an import."""
    match = re.match(
        rf"^\s*{keyword}\s+(.+?)\s*;\s*$",
        get_tree_sitter_node_text(node, source_bytes),
        flags=re.DOTALL,
    )
    return match.group(1).strip() if match else None


def _extract_java_declared_names(node: Any, source_bytes: bytes) -> List[str]:
    names: List[str] = []
    for descendant in iterate_named_descendants(node):
        if descendant.type == "variable_declarator":
            identifier = find_first_named_child(descendant, {"identifier"})
            if identifier is not None:
                names.append(get_tree_sitter_node_text(identifier, source_bytes))
    return names


def _summarize_java_declaration(node: Any, source_bytes: bytes) -> Dict[str, Any]:
    return {
        "line": node.start_point.row + 1,
        "text": compact_tree_text(get_tree_sitter_node_text(node, source_bytes)),
        "declared_names": _extract_java_declared_names(node, source_bytes),
    }


def _extract_java_call_target(node: Any, source_bytes: bytes) -> str:
    if node.type == "method_invocation":
        return ".".join(
            get_tree_sitter_node_text(child, source_bytes)
            for child in getattr(node, "named_children", [])
            if child.type != "argument_list"
        )
    if node.type == "object_creation_expression":
        created_type = find_first_named_child(node, {"type_identifier", "generic_type"})
        if created_type is not None:
            return f"new {get_tree_sitter_node_text(created_type, source_bytes)}"
    return compact_tree_text(get_tree_sitter_node_text(node, source_bytes))


def _collect_java_calls(node: Any, source_bytes: bytes) -> List[Dict[str, Any]]:
    return collect_calls_from_descendants(
        node,
        source_bytes,
        call_types=CALL_TYPES,
        extract_callee=_extract_java_call_target,
    )


def _summarize_java_method(
    node: Any, source_bytes: bytes, comments: List[str]
) -> Dict[str, Any]:
    name_node = find_first_named_child(node, {"identifier"})
    parameter_node = find_first_named_child(node, {"formal_parameters"})
    body = find_first_named_child(node, {"block"})
    return_type = " ".join(
        compact_tree_text(get_tree_sitter_node_text(child, source_bytes))
        for child in getattr(node, "named_children", [])
        if child not in {name_node, parameter_node, body}
    ).strip()

    return {
        "line": node.start_point.row + 1,
        "name": (
            get_tree_sitter_node_text(name_node, source_bytes)
            if name_node is not None
            else None
        ),
        "signature": compact_tree_text(
            get_tree_sitter_node_text(node, source_bytes).split("{", 1)[0]
        ),
        "return_type": return_type or None,
        "parameters": extract_compact_argument_texts(parameter_node, source_bytes),
        "comments": comments,
        **summarize_callable_body(
            body,
            source_bytes,
            declaration_types={"local_variable_declaration"},
            loop_types=LOOP_TYPES,
            conditional_types=CONDITIONAL_TYPES,
            summarize_declaration=_summarize_java_declaration,
            collect_calls=_collect_java_calls,
        ),
    }


def _summarize_java_class(
    node: Any, source_bytes: bytes, comments: List[str]
) -> Dict[str, Any]:
    return summarize_class_like_node(
        node,
        source_bytes,
        comments,
        kind=node.type.replace("_declaration", ""),
        body_types={"class_body", "interface_body", "enum_body"},
        method_types={"method_declaration", "constructor_declaration"},
        summarize_method=_summarize_java_method,
    )


def _summarize_java_program(
    root_node: Any,
    source_bytes: bytes,
    node_counts: Dict[str, int],
) -> Dict[str, Any]:
    package_name: Optional[str] = None
    imports: List[str] = []
    classes: List[Dict[str, Any]] = []
    orphan_comments: List[str] = []

    for child, comments in iterate_named_children_with_comments(root_node, source_bytes):
        if child is None:
            orphan_comments.extend(comments)
            continue
        if child.type == "package_declaration":
            orphan_comments.extend(comments)
            package_name = _extract_statement_value(child, source_bytes, "package")
        elif child.type == "import_declaration":
            orphan_comments.extend(comments)
            import_value = _extract_statement_value(child, source_bytes, "import")
            if import_value:
                imports.append(import_value)
        elif child.type in CLASS_LIKE_TYPES:
            classes.append(_summarize_java_class(child, source_bytes, comments))
        else:
            orphan_comments.extend(comments)

    return build_source_code_summary(
        root_node,
        source_bytes,
        node_counts,
        language="java",
        summary={"package": package_name, "imports": imports, "classes": classes},
        orphan_comments=orphan_comments,
    )


def parse_data(content: str) -> Optional[ParserAttempt]:
    return try_parse_with_tree_sitter(
        content=content,
        language=JAVA_LANGUAGE,
        detector=looks_like_java_source,
        expected_root_type="program",
        required_top_level_types={
            "package_declaration",
            "import_declaration",
            *CLASS_LIKE_TYPES,
        },
        format_name="java_source",
        parser_name="tree-sitter-java",
        summarizer=_summarize_java_program,
    )
