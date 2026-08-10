import re
from typing import Dict, Optional

from format_detection_core import ParserAttempt, rdflib
from parsers.common_preprocess import preprocess_data_for_ai


def parse_data(content: str) -> Optional[ParserAttempt]:
    snippet = content[:4000]
    has_ttl_signal = (
        "@prefix" in snippet.lower()
        or "@base" in snippet.lower()
        or bool(
            re.search(
                r"^\s*prefix\s+\w*:\s*<[^>]+>", snippet, re.IGNORECASE | re.MULTILINE
            )
        )
        or bool(re.search(r"^\s*base\s+<[^>]+>", snippet, re.IGNORECASE | re.MULTILINE))
        or ("<" in snippet and ">" in snippet and "." in snippet)
        or bool(re.search(r"\b[a-zA-Z][\w-]*:[\w-]+\b", snippet))
    )
    if not has_ttl_signal:
        return None

    if rdflib is not None:
        for fmt in ["turtle", "n3", "nt", "trig"]:
            graph = rdflib.Graph()
            try:
                graph.parse(data=content, format=fmt)
            except Exception:
                continue
            if len(graph) == 0:
                continue

            triples = [
                {
                    "subject": str(subject),
                    "predicate": str(predicate),
                    "object": str(obj),
                    "object_type": obj.__class__.__name__,
                }
                for subject, predicate, obj in graph
            ]
            prefixes = [
                {"prefix": prefix, "namespace": str(namespace)}
                for prefix, namespace in graph.namespaces()
            ]
            return ParserAttempt(
                format="ttl",
                parsed_json={"triples": triples, "prefixes": prefixes},
                parser_name=f"rdflib-{fmt}",
            )

    prefix_pattern = re.compile(
        r"^\s*@?prefix\s+([A-Za-z][\w-]*):\s*<([^>]+)>\s*\.?\s*$",
        re.IGNORECASE,
    )
    base_pattern = re.compile(r"^\s*@?base\s*<([^>]+)>\s*\.?\s*$", re.IGNORECASE)
    simple_triple_pattern = re.compile(
        r"^\s*(<[^>]+>|[A-Za-z][\w-]*:[^\s]+)\s+"
        r"(<[^>]+>|[A-Za-z][\w-]*:[^\s]+|a)\s+"
        r"(.+?)\s*\.\s*$"
    )

    prefixes = []
    triples = []
    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        prefix_match = prefix_pattern.match(line)
        if prefix_match:
            prefixes.append(
                {"prefix": prefix_match.group(1), "namespace": prefix_match.group(2)}
            )
            continue

        base_match = base_pattern.match(line)
        if base_match:
            prefixes.append({"prefix": "", "namespace": base_match.group(1)})
            continue

        triple_match = simple_triple_pattern.match(line)
        if triple_match:
            triples.append(
                {
                    "subject": triple_match.group(1).strip(),
                    "predicate": triple_match.group(2).strip(),
                    "object": triple_match.group(3).strip(),
                    "object_type": "LiteralOrNode",
                }
            )

    if len(prefixes) == 0 and len(triples) == 0:
        return None

    return ParserAttempt(
        format="ttl",
        parsed_json={"triples": triples, "prefixes": prefixes, "raw_ttl": content},
        parser_name="ttl-text-fallback",
    )
