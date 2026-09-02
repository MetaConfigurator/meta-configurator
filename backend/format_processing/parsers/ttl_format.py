import re
from typing import Optional

from format_detection_core import ParserAttempt, rdflib


RDF_SERIALIZATIONS_TO_TRY = ("turtle", "n3", "nt", "trig")


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
            parsed_json={
                "triples": [
                    {
                        "subject": str(subject),
                        "predicate": str(predicate),
                        "object": str(graph_object),
                        "object_type": graph_object.__class__.__name__,
                    }
                    for subject, predicate, graph_object in graph
                ],
                "prefixes": [
                    {"prefix": prefix, "namespace": str(namespace)}
                    for prefix, namespace in graph.namespaces()
                ],
            },
            parser_name=f"rdflib-{rdf_serialization}",
        )

    return None
