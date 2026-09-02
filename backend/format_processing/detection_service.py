from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional

import format_detection_core as core

from models import DetectionResult
from preprocess import preprocess_data_for_ai
from parsers import (
    cif_format,
    csv_format,
    dotenv_format,
    ini_format,
    json_format,
    jsonl_format,
    markdown_table_format,
    properties_format,
    star_family_format,
    toml_format,
    tsv_format,
    ttl_format,
    xml_format,
    yaml_format,
)


ParserFunction = Callable[[str], Optional[core.ParserAttempt]]
ContentDetectionFunction = Callable[[str], bool]


@dataclass(frozen=True)
class SupportedFormat:
    name: str
    display_name: str
    ai_prompt_hint: str
    parse_data: ParserFunction
    file_extensions: tuple[str, ...]
    mime_type_markers: tuple[str, ...]
    content_detector: Optional[ContentDetectionFunction] = None

    def get_match_tier(
        self, file_extension: str, mime_type: str, content: str
    ) -> int:
        """Return a lower tier for stronger format evidence."""
        if file_extension in self.file_extensions:
            return 0
        if any(marker in mime_type for marker in self.mime_type_markers):
            return 1
        if self.content_detector is not None and self.content_detector(content):
            return 2
        return 3


SUPPORTED_FORMATS = (
    SupportedFormat(
        name="json",
        display_name="JSON",
        ai_prompt_hint=(
            "Input is valid JSON. Parse with JSON.parse(input) and map fields "
            "conservatively."
        ),
        parse_data=json_format.parse_data,
        file_extensions=("json",),
        mime_type_markers=("json",),
        content_detector=json_format.looks_like_json,
    ),
    SupportedFormat(
        name="jsonl",
        display_name="JSON Lines",
        ai_prompt_hint=(
            "Input is JSON Lines (NDJSON). Split by lines, JSON.parse each "
            "non-empty line, then map the resulting array."
        ),
        parse_data=jsonl_format.parse_data,
        file_extensions=("json", "jsonl", "ndjson"),
        mime_type_markers=("json",),
        content_detector=json_format.looks_like_json,
    ),
    SupportedFormat(
        name="yaml",
        display_name="YAML",
        ai_prompt_hint=(
            "Input is YAML. Parse the document first and preserve nested structure "
            "while mapping."
        ),
        parse_data=yaml_format.parse_data,
        file_extensions=("yaml", "yml"),
        mime_type_markers=("yaml", "yml"),
    ),
    SupportedFormat(
        name="xml",
        display_name="XML",
        ai_prompt_hint=(
            "Input is XML. Preserve nested hierarchy, attributes, and repeated child "
            "nodes while mapping."
        ),
        parse_data=xml_format.parse_data,
        file_extensions=("xml",),
        mime_type_markers=("xml",),
        content_detector=xml_format.looks_like_xml,
    ),
    SupportedFormat(
        name="toml",
        display_name="TOML",
        ai_prompt_hint=(
            "Input is TOML. Parse TOML to an object first, then map to the target "
            "JSON shape."
        ),
        parse_data=toml_format.parse_data,
        file_extensions=("toml",),
        mime_type_markers=(),
    ),
    SupportedFormat(
        name="ini",
        display_name="INI",
        ai_prompt_hint=(
            "Input is INI. Parse sections and keys, and keep section nesting explicit "
            "in mapped JSON."
        ),
        parse_data=ini_format.parse_data,
        file_extensions=("ini", "cfg", "conf"),
        mime_type_markers=(),
    ),
    SupportedFormat(
        name="dotenv",
        display_name="dotenv",
        ai_prompt_hint=(
            "Input is dotenv/env format. Preserve environment variable names and "
            "usually keep values as strings."
        ),
        parse_data=dotenv_format.parse_data,
        file_extensions=("env",),
        mime_type_markers=(),
        content_detector=dotenv_format.looks_like_dotenv,
    ),
    SupportedFormat(
        name="properties",
        display_name="Java properties",
        ai_prompt_hint=(
            "Input is Java properties format. Preserve dotted keys and key-value "
            "semantics while mapping."
        ),
        parse_data=properties_format.parse_data,
        file_extensions=("properties",),
        mime_type_markers=(),
        content_detector=properties_format.looks_like_properties,
    ),
    SupportedFormat(
        name="tsv",
        display_name="TSV",
        ai_prompt_hint=(
            "Input is TSV. Preserve header names, row order, and tab-delimited columns "
            "while mapping."
        ),
        parse_data=tsv_format.parse_data,
        file_extensions=("tsv",),
        mime_type_markers=("tsv",),
        content_detector=tsv_format.looks_like_tsv,
    ),
    SupportedFormat(
        name="csv",
        display_name="CSV",
        ai_prompt_hint=(
            "Input is CSV. Preserve header names, row order, and stable columns while "
            "mapping."
        ),
        parse_data=csv_format.parse_data,
        file_extensions=("csv",),
        mime_type_markers=("csv",),
        content_detector=csv_format.looks_like_csv,
    ),
    SupportedFormat(
        name="markdown_table",
        display_name="Markdown table",
        ai_prompt_hint=(
            "Input is a Markdown table. Preserve header names and row order while "
            "mapping."
        ),
        parse_data=markdown_table_format.parse_data,
        file_extensions=("md", "markdown"),
        mime_type_markers=("markdown",),
        content_detector=markdown_table_format.looks_like_markdown_table,
    ),
    SupportedFormat(
        name="ttl",
        display_name="Turtle / RDF",
        ai_prompt_hint=(
            "Input is Turtle/RDF already parsed by the backend. Preserve triples, "
            "predicates, namespaces, and object types while mapping."
        ),
        parse_data=ttl_format.parse_data,
        file_extensions=("ttl", "turtle", "rdf"),
        mime_type_markers=("text/turtle", "application/turtle", "rdf"),
        content_detector=ttl_format.looks_like_turtle,
    ),
    SupportedFormat(
        name="cif",
        display_name="CIF",
        ai_prompt_hint=(
            "Input is CIF/mmCIF-style data already parsed by the backend. Preserve block "
            "structure, item names, loop/table semantics, crystallographic category/tag "
            "structure, and tag/value relationships while mapping."
        ),
        parse_data=cif_format.parse_data,
        file_extensions=("cif", "mmcif", "mcif"),
        mime_type_markers=("cif",),
        content_detector=cif_format.looks_like_cif,
    ),
    SupportedFormat(
        name="star_family",
        display_name="STAR family",
        ai_prompt_hint=(
            "Input is STAR-family data already parsed by the backend. Preserve block "
            "structure, item names, loop/table semantics, and tag/value structure while "
            "mapping."
        ),
        parse_data=star_family_format.parse_data,
        file_extensions=("mpif", "star", "cif", "mmcif", "mcif"),
        mime_type_markers=("cif",),
        content_detector=star_family_format.looks_like_star_family,
    ),
)

SUPPORTED_FORMAT_BY_NAME = {
    supported_format.name: supported_format for supported_format in SUPPORTED_FORMATS
}

if len(SUPPORTED_FORMAT_BY_NAME) != len(SUPPORTED_FORMATS):
    raise ValueError("Supported format names must be unique.")


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

    file_extension = core.get_file_extension(file_name)
    mime_type = (file_type or "").strip().lower()
    formats_to_try = _get_formats_ordered_by_match_strength(
        file_extension, mime_type, content
    )

    for supported_format in formats_to_try:
        parsing_result = supported_format.parse_data(content)
        if parsing_result:
            display_text = _build_display_text(
                parsing_result.format, parsing_result.parser_name
            )
            preprocessed_data = preprocess_data_for_ai(
                parsing_result.parsed_json, preprocess_options
            )
            return DetectionResult(
                recognized=True,
                format=parsing_result.format,
                parsed_json=core.to_json_safe(parsing_result.parsed_json),
                preprocessed_for_ai=core.to_json_safe(preprocessed_data),
                message=display_text,
                display_text=display_text,
                parser_name=parsing_result.parser_name,
                ai_prompt_hint=supported_format.ai_prompt_hint,
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


def _build_display_text(format_name: str, parser_name: Optional[str]) -> str:
    supported_format = SUPPORTED_FORMAT_BY_NAME.get(format_name)
    display_name = (
        supported_format.display_name if supported_format else format_name
    )
    if parser_name:
        return f'Backend recognized {display_name} using parser "{parser_name}".'
    return f"Backend recognized {display_name}."


def _get_formats_ordered_by_match_strength(
    file_extension: str,
    mime_type: str,
    content: str,
) -> List[SupportedFormat]:
    """Order formats by evidence strength; sorting is stable, so the declaration
    order of SUPPORTED_FORMATS breaks ties and acts as the detection priority."""
    return sorted(
        SUPPORTED_FORMATS,
        key=lambda supported_format: supported_format.get_match_tier(
            file_extension, mime_type, content
        ),
    )
