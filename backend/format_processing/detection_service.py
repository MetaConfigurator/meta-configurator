import re
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional

import format_detection_core as core

from models import DetectionResult
from parsers import (
    cif_format,
    csv_format,
    cpp_source,
    dotenv_format,
    ini_format,
    java_source,
    json_format,
    jsonl_format,
    markdown_table_format,
    properties_format,
    python_source,
    star_family_format,
    toml_format,
    tsv_format,
    ttl_format,
    xml_format,
    yaml_format,
)


ParserFunc = Callable[[str], Optional[Any]]
PreprocessFunc = Callable[[Any, Optional[Dict[str, Any]]], Any]


@dataclass(frozen=True)
class ParserRegistration:
    parse_data: ParserFunc
    preprocess_data_for_ai: PreprocessFunc


FORMAT_DISPLAY_NAMES: Dict[str, str] = {
    "json": "JSON",
    "jsonl": "JSON Lines",
    "yaml": "YAML",
    "xml": "XML",
    "toml": "TOML",
    "ini": "INI",
    "dotenv": "dotenv",
    "properties": "Java properties",
    "cpp_source": "C++ source code",
    "python_source": "Python source code",
    "java_source": "Java source code",
    "csv": "CSV",
    "tsv": "TSV",
    "markdown_table": "Markdown table",
    "ttl": "Turtle / RDF",
    "star_family": "STAR family",
    "cif": "CIF",
    "unknown": "unknown format",
}

AI_PROMPT_HINTS: Dict[str, str] = {
    "json": "Input is valid JSON. Parse with JSON.parse(input) and map fields conservatively.",
    "jsonl": "Input is JSON Lines (NDJSON). Split by lines, JSON.parse each non-empty line, then map the resulting array.",
    "yaml": "Input is YAML. Parse the document first and preserve nested structure while mapping.",
    "xml": "Input is XML. Preserve nested hierarchy, attributes, and repeated child nodes while mapping.",
    "toml": "Input is TOML. Parse TOML to an object first, then map to the target JSON shape.",
    "ini": "Input is INI. Parse sections and keys, and keep section nesting explicit in mapped JSON.",
    "dotenv": "Input is dotenv/env format. Preserve environment variable names and usually keep values as strings.",
    "properties": "Input is Java properties format. Preserve dotted keys and key-value semantics while mapping.",
    "cpp_source": "Input is C++ source code parsed by the backend into a compact syntax tree plus semantic summary. Preserve syntax tree structure, includes, declarations, classes, functions, calls, and benchmark registrations while mapping.",
    "python_source": "Input is Python source code already summarized by the backend. Preserve imports, classes, functions, decorators, and call structure while mapping.",
    "java_source": "Input is Java source code parsed by the backend into a compact syntax tree plus semantic summary. Preserve syntax tree structure, package, imports, classes, methods, loops, conditionals, and call structure while mapping.",
    "csv": "Input is CSV. Preserve header names, row order, and stable columns while mapping.",
    "tsv": "Input is TSV. Preserve header names, row order, and tab-delimited columns while mapping.",
    "markdown_table": "Input is a Markdown table. Preserve header names and row order while mapping.",
    "ttl": "Input is Turtle/RDF already parsed by the backend. Preserve triples, predicates, namespaces, and object types while mapping.",
    "star_family": "Input is STAR-family data already parsed by the backend. Preserve block structure, item names, loop/table semantics, and tag/value structure while mapping.",
    "cif": "Input is CIF/mmCIF-style data already parsed by the backend. Preserve block structure, item names, loop/table semantics, crystallographic category/tag structure, and tag/value relationships while mapping.",
}


JSON_PARSER = ParserRegistration(
    parse_data=json_format.parse_data,
    preprocess_data_for_ai=json_format.preprocess_data_for_ai,
)
JSONL_PARSER = ParserRegistration(
    parse_data=jsonl_format.parse_data,
    preprocess_data_for_ai=jsonl_format.preprocess_data_for_ai,
)
YAML_PARSER = ParserRegistration(
    parse_data=yaml_format.parse_data,
    preprocess_data_for_ai=yaml_format.preprocess_data_for_ai,
)
XML_PARSER = ParserRegistration(
    parse_data=xml_format.parse_data,
    preprocess_data_for_ai=xml_format.preprocess_data_for_ai,
)
TOML_PARSER = ParserRegistration(
    parse_data=toml_format.parse_data,
    preprocess_data_for_ai=toml_format.preprocess_data_for_ai,
)
INI_PARSER = ParserRegistration(
    parse_data=ini_format.parse_data,
    preprocess_data_for_ai=ini_format.preprocess_data_for_ai,
)
ENV_PARSER = ParserRegistration(
    parse_data=dotenv_format.parse_data,
    preprocess_data_for_ai=dotenv_format.preprocess_data_for_ai,
)
PROPERTIES_PARSER = ParserRegistration(
    parse_data=properties_format.parse_data,
    preprocess_data_for_ai=properties_format.preprocess_data_for_ai,
)
CPP_SOURCE_PARSER = ParserRegistration(
    parse_data=cpp_source.parse_data,
    preprocess_data_for_ai=cpp_source.preprocess_data_for_ai,
)
PYTHON_SOURCE_PARSER = ParserRegistration(
    parse_data=python_source.parse_data,
    preprocess_data_for_ai=python_source.preprocess_data_for_ai,
)
JAVA_SOURCE_PARSER = ParserRegistration(
    parse_data=java_source.parse_data,
    preprocess_data_for_ai=java_source.preprocess_data_for_ai,
)
TSV_PARSER = ParserRegistration(
    parse_data=tsv_format.parse_data,
    preprocess_data_for_ai=tsv_format.preprocess_data_for_ai,
)
CSV_PARSER = ParserRegistration(
    parse_data=csv_format.parse_data,
    preprocess_data_for_ai=csv_format.preprocess_data_for_ai,
)
MARKDOWN_TABLE_PARSER = ParserRegistration(
    parse_data=markdown_table_format.parse_data,
    preprocess_data_for_ai=markdown_table_format.preprocess_data_for_ai,
)
TTL_PARSER = ParserRegistration(
    parse_data=ttl_format.parse_data,
    preprocess_data_for_ai=ttl_format.preprocess_data_for_ai,
)
STAR_FAMILY_PARSER = ParserRegistration(
    parse_data=star_family_format.parse_data,
    preprocess_data_for_ai=star_family_format.preprocess_data_for_ai,
)
CIF_PARSER = ParserRegistration(
    parse_data=cif_format.parse_data,
    preprocess_data_for_ai=cif_format.preprocess_data_for_ai,
)


BASE_PARSERS = [
    JSON_PARSER,
    JSONL_PARSER,
    YAML_PARSER,
    XML_PARSER,
    TOML_PARSER,
    INI_PARSER,
    ENV_PARSER,
    PROPERTIES_PARSER,
    CPP_SOURCE_PARSER,
    PYTHON_SOURCE_PARSER,
    JAVA_SOURCE_PARSER,
    TSV_PARSER,
    CSV_PARSER,
    MARKDOWN_TABLE_PARSER,
    TTL_PARSER,
    CIF_PARSER,
    STAR_FAMILY_PARSER,
]

PARSER_BY_FORMAT: Dict[str, ParserRegistration] = {
    "json": JSON_PARSER,
    "jsonl": JSONL_PARSER,
    "yaml": YAML_PARSER,
    "xml": XML_PARSER,
    "toml": TOML_PARSER,
    "ini": INI_PARSER,
    "dotenv": ENV_PARSER,
    "properties": PROPERTIES_PARSER,
    "cpp_source": CPP_SOURCE_PARSER,
    "python_source": PYTHON_SOURCE_PARSER,
    "java_source": JAVA_SOURCE_PARSER,
    "csv": CSV_PARSER,
    "tsv": TSV_PARSER,
    "markdown_table": MARKDOWN_TABLE_PARSER,
    "ttl": TTL_PARSER,
    "star_family": STAR_FAMILY_PARSER,
    "cif": CIF_PARSER,
}


def detect_format_and_parse(
    file_name: str,
    file_type: str,
    raw_content: str,
    preprocess_options: Optional[Dict[str, Any]] = None,
) -> DetectionResult:
    content = raw_content if isinstance(raw_content, str) else str(raw_content)
    if not content.strip():
        message = "Input file is empty or contains only whitespace."
        return DetectionResult(
            recognized=False,
            format="unknown",
            parsed_json=None,
            preprocessed_for_ai=None,
            message=message,
            display_text=message,
        )

    extension = core._get_extension(file_name)
    mime = (file_type or "").strip().lower()
    parser_order = _get_prioritized_parsers(extension, mime, content)

    for parser in parser_order:
        attempt = parser.parse_data(content)
        if attempt:
            display_text = _build_display_text(attempt.format, attempt.parser_name)
            preprocessed = parser.preprocess_data_for_ai(
                attempt.parsed_json,
                preprocess_options,
            )
            return DetectionResult(
                recognized=True,
                format=attempt.format,
                parsed_json=core._to_json_safe(attempt.parsed_json),
                preprocessed_for_ai=core._to_json_safe(preprocessed),
                message=display_text,
                display_text=display_text,
                parser_name=attempt.parser_name,
                ai_prompt_hint=AI_PROMPT_HINTS.get(attempt.format, ""),
            )

    message = (
        "Backend could not recognize a supported format. Falling back to AI mapping."
    )
    return DetectionResult(
        recognized=False,
        format="unknown",
        parsed_json=None,
        preprocessed_for_ai=None,
        message=message,
        display_text=message,
        ai_prompt_hint="",
    )


def preprocess_parsed_data_for_ai(
    parsed_data: Any,
    format_name: str = "json",
    preprocess_options: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    parser = PARSER_BY_FORMAT.get(format_name, JSON_PARSER)
    preprocessed = parser.preprocess_data_for_ai(parsed_data, preprocess_options)
    display_name = FORMAT_DISPLAY_NAMES.get(format_name, format_name or "JSON")
    return {
        "format": format_name,
        "preprocessed_for_ai": core._to_json_safe(preprocessed),
        "display_text": f"Backend prepared AI preview for {display_name}.",
        "ai_prompt_hint": AI_PROMPT_HINTS.get(
            format_name, AI_PROMPT_HINTS.get("json", "")
        ),
    }


def _build_display_text(format_name: str, parser_name: Optional[str]) -> str:
    display_name = FORMAT_DISPLAY_NAMES.get(format_name, format_name)
    if parser_name:
        return f'Backend recognized {display_name} using parser "{parser_name}".'
    return f"Backend recognized {display_name}."


def _get_prioritized_parsers(
    extension: str,
    mime: str,
    content: str,
) -> List[ParserRegistration]:
    priorities: Dict[str, List[ParserRegistration]] = {
        "json": [JSON_PARSER, JSONL_PARSER],
        "jsonl": [JSONL_PARSER],
        "ndjson": [JSONL_PARSER],
        "yaml": [YAML_PARSER],
        "yml": [YAML_PARSER],
        "xml": [XML_PARSER],
        "toml": [TOML_PARSER],
        "ini": [INI_PARSER],
        "cfg": [INI_PARSER],
        "conf": [INI_PARSER],
        "env": [ENV_PARSER],
        "properties": [PROPERTIES_PARSER],
        "cpp": [CPP_SOURCE_PARSER],
        "cc": [CPP_SOURCE_PARSER],
        "cxx": [CPP_SOURCE_PARSER],
        "c++": [CPP_SOURCE_PARSER],
        "hpp": [CPP_SOURCE_PARSER],
        "hh": [CPP_SOURCE_PARSER],
        "hxx": [CPP_SOURCE_PARSER],
        "ipp": [CPP_SOURCE_PARSER],
        "tpp": [CPP_SOURCE_PARSER],
        "h": [CPP_SOURCE_PARSER],
        "py": [PYTHON_SOURCE_PARSER],
        "pyw": [PYTHON_SOURCE_PARSER],
        "java": [JAVA_SOURCE_PARSER],
        "csv": [CSV_PARSER],
        "tsv": [TSV_PARSER],
        "md": [MARKDOWN_TABLE_PARSER],
        "markdown": [MARKDOWN_TABLE_PARSER],
        "ttl": [TTL_PARSER],
        "turtle": [TTL_PARSER],
        "rdf": [TTL_PARSER],
        "mpif": [STAR_FAMILY_PARSER],
        "star": [STAR_FAMILY_PARSER],
        "cif": [CIF_PARSER, STAR_FAMILY_PARSER],
        "mmcif": [CIF_PARSER, STAR_FAMILY_PARSER],
        "mcif": [CIF_PARSER, STAR_FAMILY_PARSER],
    }

    mime_hints: List[ParserRegistration] = []
    if "json" in mime:
        mime_hints.extend([JSON_PARSER, JSONL_PARSER])
    if "yaml" in mime or "yml" in mime:
        mime_hints.append(YAML_PARSER)
    if "xml" in mime:
        mime_hints.append(XML_PARSER)
    if "c++" in mime or "cpp" in mime or "x-c++" in mime:
        mime_hints.append(CPP_SOURCE_PARSER)
    if "python" in mime or "x-python" in mime:
        mime_hints.append(PYTHON_SOURCE_PARSER)
    if "java" in mime:
        mime_hints.append(JAVA_SOURCE_PARSER)
    if "csv" in mime:
        mime_hints.append(CSV_PARSER)
    if "tsv" in mime:
        mime_hints.append(TSV_PARSER)
    if "markdown" in mime:
        mime_hints.append(MARKDOWN_TABLE_PARSER)
    if "text/turtle" in mime or "application/turtle" in mime or "rdf" in mime:
        mime_hints.append(TTL_PARSER)
    if "cif" in mime:
        mime_hints.extend([CIF_PARSER, STAR_FAMILY_PARSER])

    ordered: List[ParserRegistration] = []

    def append_unique(items: List[ParserRegistration]) -> None:
        for item in items:
            if item not in ordered:
                ordered.append(item)

    append_unique(priorities.get(extension, []))
    append_unique(mime_hints)

    if content.lstrip().startswith("{") or content.lstrip().startswith("["):
        append_unique([JSON_PARSER, JSONL_PARSER, YAML_PARSER])
    if "<?xml" in content[:200] or re.search(r"<[A-Za-z_][^>]*>", content[:500]):
        append_unique([XML_PARSER])
    if "\t" in content and "\n" in content:
        append_unique([TSV_PARSER])
    if "," in content and "\n" in content:
        append_unique([CSV_PARSER])
    if re.search(
        r"^\s*(export\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=\s*.+$", content, flags=re.MULTILINE
    ):
        append_unique([ENV_PARSER])
    if re.search(r"^\s*[^\s:=#!][^:=]*\s*[:=]\s*.+$", content, flags=re.MULTILINE):
        append_unique([PROPERTIES_PARSER])
    if cpp_source.looks_like_cpp_source(content):
        append_unique([CPP_SOURCE_PARSER])
    if python_source.looks_like_python_source(content):
        append_unique([PYTHON_SOURCE_PARSER])
    if java_source.looks_like_java_source(content):
        append_unique([JAVA_SOURCE_PARSER])
    if re.search(r"^\s*\|.+\|\s*$", content, flags=re.MULTILINE) and re.search(
        r"^\s*\|?(?:\s*:?-{3,}:?\s*\|){1,}\s*:?-{3,}:?\s*\|?\s*$",
        content,
        flags=re.MULTILINE,
    ):
        append_unique([MARKDOWN_TABLE_PARSER])
    cif_content_signal = bool(
        re.search(
            r"^\s*_(?:audit|atom_site|cell|chemical|database|diffrn|entity|exptl|publ|refine|space_group|struct|symmetry)[_.]",
            content[:12000],
            flags=re.MULTILINE,
        )
    )
    if cif_content_signal:
        append_unique([CIF_PARSER])
    if (
        "data_" in content[:1000]
        or "loop_" in content[:1000]
        or "save_" in content[:1000]
        or re.search(r"^\s*_[A-Za-z0-9]", content[:4000], flags=re.MULTILINE)
    ):
        append_unique([STAR_FAMILY_PARSER])
    if "@prefix" in content[:4000] or "@base" in content[:4000]:
        append_unique([TTL_PARSER])

    append_unique(BASE_PARSERS)
    return ordered
