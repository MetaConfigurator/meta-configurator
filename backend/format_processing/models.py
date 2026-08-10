from dataclasses import dataclass
from typing import Any, Optional


KnownFormat = str


@dataclass
class DetectionResult:
    recognized: bool
    format: KnownFormat
    parsed_json: Optional[Any]
    preprocessed_for_ai: Optional[Any]
    message: str
    display_text: str
    parser_name: Optional[str] = None
    ai_prompt_hint: str = ""
