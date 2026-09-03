import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


MAX_STRING_LEN = 4000
TARGET_DOCUMENT_SIZE_BYTES = 64 * 1024
INITIAL_ARRAY_LIMIT = 64
MIN_ARRAY_LIMIT = 2
OBJECT_KEY_FACTOR = 8


@dataclass(frozen=True)
class PreprocessLimits:
    max_string_length: int
    target_document_size_bytes: int
    initial_array_length: int
    minimum_array_length: int
    object_key_factor: int


def _truncate_string(value: str, max_length: int) -> str:
    if len(value) <= max_length:
        return value
    return f"{value[:max_length]}...[TRUNCATED_{len(value) - max_length}_CHARS]"


def _coerce_positive_int(value: Any, default: int, minimum: int) -> int:
    try:
        coerced = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, coerced)


def _resolve_preprocess_limits(
    options: Optional[Dict[str, Any]],
) -> PreprocessLimits:
    raw_options = options if isinstance(options, dict) else {}
    initial_array_length = _coerce_positive_int(
        raw_options.get("initial_array_limit"),
        INITIAL_ARRAY_LIMIT,
        1,
    )
    minimum_array_length = min(
        _coerce_positive_int(
            raw_options.get("min_array_limit"),
            MIN_ARRAY_LIMIT,
            1,
        ),
        initial_array_length,
    )
    return PreprocessLimits(
        max_string_length=_coerce_positive_int(
            raw_options.get("max_string_len"), MAX_STRING_LEN, 1
        ),
        target_document_size_bytes=1024
        * _coerce_positive_int(
            raw_options.get("target_document_size_kb"),
            TARGET_DOCUMENT_SIZE_BYTES // 1024,
            1,
        ),
        initial_array_length=initial_array_length,
        minimum_array_length=minimum_array_length,
        object_key_factor=_coerce_positive_int(
            raw_options.get("object_key_factor"),
            OBJECT_KEY_FACTOR,
            1,
        ),
    )


def _serialize_size_bytes(value: Any) -> int:
    return len(
        json.dumps(
            value, ensure_ascii=False, separators=(",", ":"), default=str
        ).encode("utf-8")
    )


def _trim_structure(
    value: Any,
    array_limit: int,
    limits: PreprocessLimits,
) -> Any:
    if isinstance(value, str):
        return _truncate_string(value, limits.max_string_length)

    if isinstance(value, (list, tuple)):
        return _trim_sequence(list(value), array_limit, limits)

    if isinstance(value, dict):
        return _trim_mapping(value, array_limit, limits)

    return value


def _trim_sequence(
    values: List[Any],
    array_limit: int,
    limits: PreprocessLimits,
) -> List[Any]:
    trimmed_values = [
        _trim_structure(item, array_limit, limits) for item in values[:array_limit]
    ]
    if len(values) > array_limit:
        trimmed_values.append({"__truncated_items__": len(values) - array_limit})
    return trimmed_values


def _trim_mapping(
    mapping: Dict[Any, Any],
    array_limit: int,
    limits: PreprocessLimits,
) -> Dict[str, Any]:
    object_key_limit = array_limit * limits.object_key_factor
    trimmed_mapping: Dict[str, Any] = {}
    keys = list(mapping.keys())
    for key in keys[:object_key_limit]:
        trimmed_mapping[str(key)] = _trim_structure(mapping[key], array_limit, limits)
    if len(keys) > object_key_limit:
        trimmed_mapping["__truncated_keys__"] = len(keys) - object_key_limit
    return trimmed_mapping


def preprocess_data_for_ai(
    value: Any,
    preprocess_options: Optional[Dict[str, Any]] = None,
) -> Any:
    """Trim the value until it serializes below the target size, halving the array
    limit each round and returning the smallest attempt once the limit bottoms out."""
    limits = _resolve_preprocess_limits(preprocess_options)

    array_limit = limits.initial_array_length
    while True:
        trimmed_value = _trim_structure(value, array_limit, limits)
        if _serialize_size_bytes(trimmed_value) <= limits.target_document_size_bytes:
            return trimmed_value
        if array_limit <= limits.minimum_array_length:
            return trimmed_value
        array_limit = max(limits.minimum_array_length, array_limit // 2)
