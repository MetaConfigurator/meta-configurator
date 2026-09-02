import re
from typing import Any, Dict, List, Optional

from format_detection_core import (
    CPP_LANGUAGE,
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
    get_first_named_child_text,
    iterate_named_children_with_comments,
    summarize_callable_body,
)

LOOP_TYPES = {"for_statement", "for_range_loop", "while_statement", "do_statement"}
CONDITIONAL_TYPES = {"if_statement", "switch_statement"}
CLASS_LIKE_TYPES = {"class_specifier", "struct_specifier"}
DECLARATOR_TYPES = {
    "init_declarator",
    "function_declarator",
    "reference_declarator",
    "pointer_declarator",
    "array_declarator",
    "structured_binding_declarator",
}


def looks_like_cpp_source(content: str) -> bool:
    return matches_source_patterns(
        content,
        [
            r'^\s*#\s*include\s*[<"].+[>"]',
            r"\bstd::[A-Za-z_]\w*",
            r"\bnamespace\s+[A-Za-z_]\w*",
            r"\bclass\s+[A-Za-z_]\w*",
            r"\btemplate\s*<",
            r"\busing\s+namespace\s+[A-Za-z_]\w*",
            r"\b[A-Za-z_]\w*\s*::\s*[A-Za-z_~]\w*\s*\(",
            r"^\s*(public|private|protected)\s*:",
            r"\bint\s+main\s*\(",
        ],
    )


def _extract_cpp_using_namespace(node: Any, source_bytes: bytes) -> Optional[str]:
    match = re.match(
        r"^\s*using\s+namespace\s+(.+?)\s*;\s*$",
        get_tree_sitter_node_text(node, source_bytes),
        flags=re.DOTALL,
    )
    return match.group(1).strip() if match else None


def _extract_cpp_declared_names(node: Any, source_bytes: bytes) -> List[str]:
    """Unwraps the nested declarator types C++ uses until the declared identifiers."""
    named_children = list(getattr(node, "named_children", []))
    if node.type == "identifier":
        return [get_tree_sitter_node_text(node, source_bytes)]
    if node.type == "structured_binding_declarator":
        return [
            get_tree_sitter_node_text(child, source_bytes)
            for child in named_children
            if child.type == "identifier"
        ]
    if not named_children:
        return []
    if node.type in {"init_declarator", "function_declarator"}:
        return _extract_cpp_declared_names(named_children[0], source_bytes)
    if node.type in {
        "reference_declarator",
        "pointer_declarator",
        "array_declarator",
        "parenthesized_declarator",
        "attributed_declarator",
    }:
        return _extract_cpp_declared_names(named_children[-1], source_bytes)
    return []


def _extract_cpp_function_name(node: Any, source_bytes: bytes) -> Optional[str]:
    return next(iter(_extract_cpp_declared_names(node, source_bytes)), None)


def _extract_cpp_call_target(node: Any, source_bytes: bytes) -> str:
    named_children = list(getattr(node, "named_children", []))
    if node.type in {
        "identifier",
        "qualified_identifier",
        "namespace_identifier",
        "field_identifier",
    }:
        return get_tree_sitter_node_text(node, source_bytes)
    if node.type == "field_expression" and len(named_children) >= 2:
        base = _extract_cpp_call_target(named_children[0], source_bytes)
        member = get_tree_sitter_node_text(named_children[1], source_bytes)
        return f"{base}.{member}"
    if node.type == "call_expression" and named_children:
        return _extract_cpp_call_target(named_children[0], source_bytes) + "()"
    return compact_tree_text(get_tree_sitter_node_text(node, source_bytes))


def _extract_cpp_callee(node: Any, source_bytes: bytes) -> str:
    callee_node = next(iter(getattr(node, "named_children", [])), node)
    return _extract_cpp_call_target(callee_node, source_bytes)


def _collect_cpp_calls(node: Any, source_bytes: bytes) -> List[Dict[str, Any]]:
    return collect_calls_from_descendants(
        node,
        source_bytes,
        call_types={"call_expression"},
        extract_callee=_extract_cpp_callee,
    )


def _summarize_cpp_declaration(node: Any, source_bytes: bytes) -> Dict[str, Any]:
    named_children = list(getattr(node, "named_children", []))
    first_declarator_index = next(
        (
            index
            for index, child in enumerate(named_children)
            if child.type in DECLARATOR_TYPES
        ),
        len(named_children),
    )
    declared_type = " ".join(
        compact_tree_text(get_tree_sitter_node_text(child, source_bytes))
        for child in named_children[:first_declarator_index]
    ).strip()
    declared_names: List[str] = []
    for child in named_children[first_declarator_index:]:
        declared_names.extend(_extract_cpp_declared_names(child, source_bytes))

    return {
        "line": node.start_point.row + 1,
        "text": compact_tree_text(get_tree_sitter_node_text(node, source_bytes)),
        "declared_type": declared_type or None,
        "declared_names": declared_names,
    }


def _summarize_cpp_class(
    node: Any, source_bytes: bytes, comments: List[str]
) -> Dict[str, Any]:
    method_names: List[str] = []
    for descendant in iterate_named_descendants(node):
        if descendant.type != "function_declarator":
            continue
        function_name = _extract_cpp_function_name(descendant, source_bytes)
        if function_name and function_name not in method_names:
            method_names.append(function_name)

    return {
        "line": node.start_point.row + 1,
        "kind": "struct" if node.type == "struct_specifier" else "class",
        "name": get_first_named_child_text(node, source_bytes, {"type_identifier"}) or "",
        "comments": comments,
        "methods": method_names,
    }


def _summarize_cpp_function(
    node: Any, source_bytes: bytes, comments: List[str]
) -> Dict[str, Any]:
    declarator = find_first_named_child(node, {"function_declarator"})
    body = find_first_named_child(node, {"compound_statement"})
    return_type = " ".join(
        compact_tree_text(get_tree_sitter_node_text(child, source_bytes))
        for child in getattr(node, "named_children", [])
        if child not in {declarator, body}
    ).strip()
    parameter_node = (
        find_first_named_child(declarator, {"parameter_list"})
        if declarator is not None
        else None
    )

    return {
        "line": node.start_point.row + 1,
        "name": (
            _extract_cpp_function_name(declarator, source_bytes)
            if declarator is not None
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
            declaration_types={"declaration"},
            loop_types=LOOP_TYPES,
            conditional_types=CONDITIONAL_TYPES,
            summarize_declaration=_summarize_cpp_declaration,
            collect_calls=_collect_cpp_calls,
        ),
    }


def _summarize_cpp_translation_unit(
    root_node: Any,
    source_bytes: bytes,
    node_counts: Dict[str, int],
) -> Dict[str, Any]:
    includes: List[str] = []
    using_namespaces: List[str] = []
    classes: List[Dict[str, Any]] = []
    functions: List[Dict[str, Any]] = []
    top_level_calls: List[Dict[str, Any]] = []
    orphan_comments: List[str] = []

    for child, comments in iterate_named_children_with_comments(root_node, source_bytes):
        if child is None:
            orphan_comments.extend(comments)
            continue
        if child.type == "preproc_include":
            orphan_comments.extend(comments)
            include_value = get_first_named_child_text(
                child, source_bytes, {"system_lib_string", "string_literal"}
            )
            if include_value:
                includes.append(include_value)
        elif child.type == "using_declaration":
            orphan_comments.extend(comments)
            namespace_name = _extract_cpp_using_namespace(child, source_bytes)
            if namespace_name:
                using_namespaces.append(namespace_name)
        elif child.type in CLASS_LIKE_TYPES:
            classes.append(_summarize_cpp_class(child, source_bytes, comments))
        elif child.type == "function_definition":
            functions.append(_summarize_cpp_function(child, source_bytes, comments))
        elif child.type == "expression_statement":
            orphan_comments.extend(comments)
            top_level_calls.extend(_collect_cpp_calls(child, source_bytes))
        else:
            orphan_comments.extend(comments)

    return build_source_code_summary(
        root_node,
        source_bytes,
        node_counts,
        language="cpp",
        summary={
            "includes": includes,
            "using_namespaces": using_namespaces,
            "classes": classes,
            "functions": functions,
            "top_level_calls": top_level_calls,
        },
        orphan_comments=orphan_comments,
    )


def parse_data(content: str) -> Optional[ParserAttempt]:
    return try_parse_with_tree_sitter(
        content=content,
        language=CPP_LANGUAGE,
        detector=looks_like_cpp_source,
        expected_root_type="translation_unit",
        required_top_level_types={
            "preproc_include",
            "function_definition",
            "declaration",
            "namespace_definition",
            "template_declaration",
            "linkage_specification",
            *CLASS_LIKE_TYPES,
        },
        format_name="cpp_source",
        parser_name="tree-sitter-cpp",
        summarizer=_summarize_cpp_translation_unit,
        minimum_named_nodes=3,
    )
