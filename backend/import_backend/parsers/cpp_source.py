import re
from typing import Any, Dict, List, Optional

from format_detection_core import (
    CPP_LANGUAGE,
    ParserAttempt,
    _coerce_literal,
    _compact_tree_text,
    _iter_named_descendants,
    _normalize_comment_text,
    _serialize_tree_sitter_node,
    _tree_sitter_node_text,
    _try_tree_sitter_source,
)
from preprocess import preprocess_data_for_ai as preprocess_preview


def looks_like_cpp_source(content: str) -> bool:
    snippet = content[:12000]
    cpp_signals = [
        r'^\s*#\s*include\s*[<"].+[>"]',
        r'\bstd::[A-Za-z_]\w*',
        r'\bnamespace\s+[A-Za-z_]\w*',
        r'\bclass\s+[A-Za-z_]\w*',
        r'\btemplate\s*<',
        r'\busing\s+namespace\s+[A-Za-z_]\w*',
        r'\b[A-Za-z_]\w*\s*::\s*[A-Za-z_~]\w*\s*\(',
        r'^\s*(public|private|protected)\s*:',
        r'\bint\s+main\s*\(',
    ]
    return any(
        re.search(pattern, snippet, flags=re.MULTILINE) is not None for pattern in cpp_signals
    )


def _extract_cpp_include(node: Any, source_bytes: bytes) -> Optional[str]:
    for child in getattr(node, 'named_children', []):
        if child.type in {'system_lib_string', 'string_literal'}:
            return _tree_sitter_node_text(child, source_bytes)
    return None


def _extract_cpp_using_namespace(node: Any, source_bytes: bytes) -> Optional[str]:
    match = re.match(
        r'^\s*using\s+namespace\s+(.+?)\s*;\s*$',
        _tree_sitter_node_text(node, source_bytes),
        flags=re.DOTALL,
    )
    if not match:
        return None
    return match.group(1).strip()


def _extract_cpp_declared_names(node: Any, source_bytes: bytes) -> List[str]:
    if node.type == 'identifier':
        return [_tree_sitter_node_text(node, source_bytes)]
    if node.type == 'init_declarator':
        if not getattr(node, 'named_children', []):
            return []
        return _extract_cpp_declared_names(node.named_children[0], source_bytes)
    if node.type in {
        'reference_declarator',
        'pointer_declarator',
        'array_declarator',
        'parenthesized_declarator',
        'attributed_declarator',
    }:
        if not getattr(node, 'named_children', []):
            return []
        return _extract_cpp_declared_names(node.named_children[-1], source_bytes)
    if node.type == 'function_declarator':
        if not getattr(node, 'named_children', []):
            return []
        return _extract_cpp_declared_names(node.named_children[0], source_bytes)
    if node.type == 'structured_binding_declarator':
        return [
            _tree_sitter_node_text(child, source_bytes)
            for child in getattr(node, 'named_children', [])
            if child.type == 'identifier'
        ]
    return []


def _extract_cpp_function_name(node: Any, source_bytes: bytes) -> Optional[str]:
    names = _extract_cpp_declared_names(node, source_bytes)
    if names:
        return names[0]
    return None


def _extract_cpp_parameter_summaries(node: Any, source_bytes: bytes) -> List[str]:
    if node.type != 'parameter_list':
        return []
    return [
        _compact_tree_text(_tree_sitter_node_text(child, source_bytes))
        for child in getattr(node, 'named_children', [])
        if child.type == 'parameter_declaration'
    ]


def _extract_cpp_call_target(node: Any, source_bytes: bytes) -> str:
    if node.type in {'identifier', 'qualified_identifier', 'namespace_identifier'}:
        return _tree_sitter_node_text(node, source_bytes)
    if node.type == 'field_identifier':
        return _tree_sitter_node_text(node, source_bytes)
    if node.type == 'field_expression':
        named_children = getattr(node, 'named_children', [])
        if len(named_children) >= 2:
            base = _extract_cpp_call_target(named_children[0], source_bytes)
            member = _tree_sitter_node_text(named_children[1], source_bytes)
            return f'{base}.{member}'
    if node.type == 'call_expression':
        named_children = getattr(node, 'named_children', [])
        if named_children:
            return _extract_cpp_call_target(named_children[0], source_bytes) + '()'
    return _compact_tree_text(_tree_sitter_node_text(node, source_bytes))


def _extract_cpp_argument_values(node: Any, source_bytes: bytes) -> List[str]:
    if node is None or node.type != 'argument_list':
        return []
    return [
        _compact_tree_text(_tree_sitter_node_text(child, source_bytes))
        for child in getattr(node, 'named_children', [])
    ]


def _summarize_cpp_declaration(node: Any, source_bytes: bytes) -> Dict[str, Any]:
    named_children = list(getattr(node, 'named_children', []))
    declarator_types = {
        'init_declarator',
        'function_declarator',
        'reference_declarator',
        'pointer_declarator',
        'array_declarator',
        'structured_binding_declarator',
    }
    first_declarator_index = next(
        (index for index, child in enumerate(named_children) if child.type in declarator_types),
        len(named_children),
    )
    declared_type = ' '.join(
        _compact_tree_text(_tree_sitter_node_text(child, source_bytes))
        for child in named_children[:first_declarator_index]
    ).strip()
    declared_names: List[str] = []
    for child in named_children[first_declarator_index:]:
        declared_names.extend(_extract_cpp_declared_names(child, source_bytes))

    return {
        'line': node.start_point.row + 1,
        'text': _compact_tree_text(_tree_sitter_node_text(node, source_bytes)),
        'declared_type': declared_type or None,
        'declared_names': declared_names,
    }


def _collect_cpp_top_level_calls(node: Any, source_bytes: bytes) -> List[Dict[str, Any]]:
    calls: List[Dict[str, Any]] = []
    for child in getattr(node, 'named_children', []):
        if child.type == 'call_expression':
            named_children = getattr(child, 'named_children', [])
            callee_node = named_children[0] if named_children else child
            argument_node = next(
                (
                    named_child
                    for named_child in named_children
                    if named_child.type == 'argument_list'
                ),
                None,
            )
            calls.append(
                {
                    'line': child.start_point.row + 1,
                    'callee': _extract_cpp_call_target(callee_node, source_bytes),
                    'arguments': _extract_cpp_argument_values(argument_node, source_bytes),
                }
            )
            continue
        calls.extend(_collect_cpp_top_level_calls(child, source_bytes))
    return calls


def _extract_cpp_call_chain(node: Any, source_bytes: bytes) -> List[Dict[str, Any]]:
    if node.type == 'call_expression':
        named_children = getattr(node, 'named_children', [])
        if not named_children:
            return []
        base = _extract_cpp_call_chain(named_children[0], source_bytes)
        argument_node = next(
            (
                named_child
                for named_child in named_children
                if named_child.type == 'argument_list'
            ),
            None,
        )
        arguments = _extract_cpp_argument_values(argument_node, source_bytes)
        if not base:
            return [
                {
                    'name': _compact_tree_text(_tree_sitter_node_text(node, source_bytes)),
                    'arguments': arguments,
                }
            ]
        if base[-1]['arguments'] is None:
            base[-1]['arguments'] = arguments
        else:
            base.append(
                {
                    'name': _compact_tree_text(
                        _tree_sitter_node_text(named_children[0], source_bytes)
                    ),
                    'arguments': arguments,
                }
            )
        return base
    if node.type == 'field_expression':
        named_children = getattr(node, 'named_children', [])
        if len(named_children) >= 2:
            base = _extract_cpp_call_chain(named_children[0], source_bytes)
            field_name = _tree_sitter_node_text(named_children[1], source_bytes)
            if base:
                base.append({'name': field_name, 'arguments': None})
                return base
    return [
        {
            'name': _compact_tree_text(_tree_sitter_node_text(node, source_bytes)),
            'arguments': None,
        }
    ]


def _summarize_cpp_benchmark_registration(
    node: Any,
    source_bytes: bytes,
) -> Optional[Dict[str, Any]]:
    if node.type != 'expression_statement':
        return None
    named_children = getattr(node, 'named_children', [])
    if not named_children or named_children[0].type != 'call_expression':
        return None

    chain = _extract_cpp_call_chain(named_children[0], source_bytes)
    if not chain or chain[0]['name'] != 'BENCHMARK' or not chain[0]['arguments']:
        return None

    registration: Dict[str, Any] = {
        'line': node.start_point.row + 1,
        'target': _coerce_literal(chain[0]['arguments'][0]),
        'name': None,
        'args': [],
        'chain': [],
    }

    for step in chain[1:]:
        step_name = step['name']
        step_args = step['arguments'] or []
        if step_name == 'Name' and step_args:
            registration['name'] = _coerce_literal(step_args[0])
            continue
        if step_name == 'Arg' and step_args:
            registration['args'].append(_coerce_literal(step_args[0]))
            continue
        registration['chain'].append(
            {
                'name': step_name,
                'arguments': [_coerce_literal(argument) for argument in step_args],
            }
        )

    if not registration['chain']:
        del registration['chain']

    return registration


def _summarize_cpp_class(node: Any, source_bytes: bytes, comments: List[str]) -> Dict[str, Any]:
    name = next(
        (
            _tree_sitter_node_text(child, source_bytes)
            for child in getattr(node, 'named_children', [])
            if child.type == 'type_identifier'
        ),
        '',
    )
    method_names: List[str] = []
    for descendant in _iter_named_descendants(node):
        if descendant.type == 'function_declarator':
            function_name = _extract_cpp_function_name(descendant, source_bytes)
            if function_name and function_name not in method_names:
                method_names.append(function_name)

    return {
        'line': node.start_point.row + 1,
        'kind': 'struct' if node.type == 'struct_specifier' else 'class',
        'name': name,
        'comments': comments,
        'methods': method_names,
    }


def _summarize_cpp_function(node: Any, source_bytes: bytes, comments: List[str]) -> Dict[str, Any]:
    named_children = list(getattr(node, 'named_children', []))
    declarator = next(
        (child for child in named_children if child.type == 'function_declarator'),
        None,
    )
    body = next(
        (child for child in named_children if child.type == 'compound_statement'),
        None,
    )
    return_type = ' '.join(
        _compact_tree_text(_tree_sitter_node_text(child, source_bytes))
        for child in named_children
        if child not in {declarator, body}
    ).strip()
    parameters: List[str] = []
    if declarator is not None:
        parameter_list = next(
            (
                child
                for child in getattr(declarator, 'named_children', [])
                if child.type == 'parameter_list'
            ),
            None,
        )
        parameters = _extract_cpp_parameter_summaries(parameter_list, source_bytes)

    declarations: List[Dict[str, Any]] = []
    loops: List[Dict[str, Any]] = []
    conditionals: List[Dict[str, Any]] = []
    calls: List[Dict[str, Any]] = []
    if body is not None:
        for descendant in _iter_named_descendants(body):
            if descendant.type == 'declaration':
                declarations.append(_summarize_cpp_declaration(descendant, source_bytes))
            elif descendant.type in {
                'for_statement',
                'for_range_loop',
                'while_statement',
                'do_statement',
            }:
                loops.append(
                    {
                        'line': descendant.start_point.row + 1,
                        'type': descendant.type,
                        'text': _compact_tree_text(
                            _tree_sitter_node_text(descendant, source_bytes),
                            max_length=140,
                        ),
                    }
                )
            elif descendant.type in {'if_statement', 'switch_statement'}:
                conditionals.append(
                    {
                        'line': descendant.start_point.row + 1,
                        'type': descendant.type,
                        'text': _compact_tree_text(
                            _tree_sitter_node_text(descendant, source_bytes),
                            max_length=140,
                        ),
                    }
                )
        calls = _collect_cpp_top_level_calls(body, source_bytes)

    return {
        'line': node.start_point.row + 1,
        'name': _extract_cpp_function_name(declarator, source_bytes)
        if declarator is not None
        else None,
        'signature': _compact_tree_text(
            _tree_sitter_node_text(node, source_bytes).split('{', 1)[0]
        ),
        'return_type': return_type or None,
        'parameters': parameters,
        'comments': comments,
        'locals': declarations,
        'calls': calls,
        'loops': loops,
        'conditionals': conditionals,
    }


def _summarize_cpp_translation_unit(
    root: Any,
    source_bytes: bytes,
    counts: Dict[str, int],
) -> Dict[str, Any]:
    includes: List[str] = []
    using_namespaces: List[str] = []
    classes: List[Dict[str, Any]] = []
    functions: List[Dict[str, Any]] = []
    benchmark_registrations: List[Dict[str, Any]] = []
    orphan_comments: List[str] = []
    pending_comments: List[str] = []

    for child in getattr(root, 'named_children', []):
        if child.type == 'comment':
            pending_comments.append(
                _normalize_comment_text(_tree_sitter_node_text(child, source_bytes))
            )
            continue
        if child.type == 'preproc_include':
            include_value = _extract_cpp_include(child, source_bytes)
            if include_value:
                includes.append(include_value)
            continue
        if child.type == 'using_declaration':
            namespace_name = _extract_cpp_using_namespace(child, source_bytes)
            if namespace_name:
                using_namespaces.append(namespace_name)
            continue
        if child.type in {'class_specifier', 'struct_specifier'}:
            classes.append(_summarize_cpp_class(child, source_bytes, pending_comments))
            pending_comments = []
            continue
        if child.type == 'function_definition':
            functions.append(_summarize_cpp_function(child, source_bytes, pending_comments))
            pending_comments = []
            continue
        benchmark_registration = _summarize_cpp_benchmark_registration(child, source_bytes)
        if benchmark_registration is not None:
            if pending_comments:
                benchmark_registration['comments'] = pending_comments
                pending_comments = []
            benchmark_registrations.append(benchmark_registration)
            continue
        if pending_comments:
            orphan_comments.extend(pending_comments)
            pending_comments = []

    if pending_comments:
        orphan_comments.extend(pending_comments)

    summary: Dict[str, Any] = {
        'language': 'cpp',
        'representation': 'syntax_tree_with_summary',
        'root_type': root.type,
        'node_counts': counts,
        'syntax_tree': _serialize_tree_sitter_node(root, source_bytes),
        'summary': {
            'includes': includes,
            'using_namespaces': using_namespaces,
            'classes': classes,
            'functions': functions,
            'benchmark_registrations': benchmark_registrations,
        },
    }
    if orphan_comments:
        summary['summary']['orphan_comments'] = orphan_comments
    return summary


def parse_data(content: str) -> Optional[ParserAttempt]:
    attempt = _try_tree_sitter_source(
        content=content,
        language=CPP_LANGUAGE,
        detector=looks_like_cpp_source,
        expected_root_type='translation_unit',
        required_top_level_types={
            'preproc_include',
            'function_definition',
            'declaration',
            'namespace_definition',
            'class_specifier',
            'struct_specifier',
            'template_declaration',
            'linkage_specification',
        },
        format_name='cpp_source',
        parser_name='tree-sitter-cpp',
        summarizer=_summarize_cpp_translation_unit,
    )
    if attempt is None:
        return None
    root_type = (
        attempt.parsed_json.get('root_type')
        if isinstance(attempt.parsed_json, dict)
        else None
    )
    node_counts = (
        attempt.parsed_json.get('node_counts', {})
        if isinstance(attempt.parsed_json, dict)
        else {}
    )
    if root_type != 'translation_unit':
        return None
    if node_counts.get('named', 0) < 3:
        return None
    return attempt


def preprocess_data_for_ai(
    parsed_file: Any,
    preprocess_options: Optional[Dict[str, Any]] = None,
) -> Any:
    del preprocess_options
    return preprocess_preview(parsed_file)

