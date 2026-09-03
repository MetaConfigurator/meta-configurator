import json
import re
from typing import Any, Optional

from format_detection_core import ParserAttempt, rdflib


RDF_SERIALIZATIONS_TO_TRY = ("turtle", "n3", "nt", "trig")
DEFAULT_NAMESPACE_BINDINGS = {
    prefix: str(namespace) for prefix, namespace in rdflib.Graph().namespaces()
} if rdflib is not None else {}


def looks_like_turtle(content: str) -> bool:
    content_prefix = content[:4000]
    return bool(
        re.search(
            r"^\s*@?(?:prefix\s+[\w-]*:\s*<[^>]+>|base\s*<[^>]+>)",
            content_prefix,
            re.IGNORECASE | re.MULTILINE,
        )
        or re.search(r"<[^>\s]+>\s+<[^>\s]+>", content_prefix)
        or re.search(r"\b[A-Za-z][\w-]*:[\w-]+\s+(?:a|[A-Za-z][\w-]*:)", content_prefix)
    )


def parse_data(content: str) -> Optional[ParserAttempt]:
    if rdflib is None or not looks_like_turtle(content):
        return None

    for rdf_serialization in RDF_SERIALIZATIONS_TO_TRY:
        graph = rdflib.Graph()
        try:
            graph.parse(data=content, format=rdf_serialization)
        except Exception:
            continue
        if len(graph) == 0:
            continue

        return ParserAttempt(
            format="ttl",
            parsed_json=_serialize_as_json_ld(graph),
            parser_name=f"rdflib-{rdf_serialization}",
        )

    return None


def _serialize_as_json_ld(graph: Any) -> dict[str, Any]:
    """Returns compacted, graph-shaped JSON-LD using prefixes declared by the source."""
    source_context = _get_source_namespace_context(graph)
    serialized_json_ld = graph.serialize(
        format="json-ld",
        context=source_context or None,
        auto_compact=bool(source_context),
    )
    parsed_json_ld = json.loads(serialized_json_ld)

    if isinstance(parsed_json_ld, dict) and "@graph" in parsed_json_ld:
        return parsed_json_ld
    if isinstance(parsed_json_ld, dict):
        context = parsed_json_ld.pop("@context", None)
        return {
            **({"@context": context} if context is not None else {}),
            "@graph": [parsed_json_ld],
        }
    elif isinstance(parsed_json_ld, list):
        return {
            **({"@context": source_context} if source_context else {}),
            "@graph": parsed_json_ld,
        }
    return {"@graph": [parsed_json_ld]}


def _get_source_namespace_context(graph: Any) -> dict[str, str]:
    context: dict[str, str] = {}
    for prefix, namespace in graph.namespaces():
        namespace_iri = str(namespace)
        if DEFAULT_NAMESPACE_BINDINGS.get(prefix) == namespace_iri:
            continue
        if prefix:
            context[str(prefix)] = namespace_iri
        else:
            context["@vocab"] = namespace_iri
    return context
