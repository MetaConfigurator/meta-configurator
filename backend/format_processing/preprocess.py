import json
from typing import Any, Dict, List, Optional


MAX_STRING_LEN = 4000
MAX_DATA_FIELD_LEN = 400
TARGET_DOCUMENT_SIZE_BYTES = 64 * 1024
INITIAL_ARRAY_LIMIT = 64
MIN_ARRAY_LIMIT = 2
OBJECT_KEY_FACTOR = 8
LONG_DATA_FIELD_TOKENS = ("_data", "pxrd", "spectrum", "intensity", "signal", "raw")


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


def _resolve_preprocess_options(options: Optional[Dict[str, Any]]) -> Dict[str, int]:
    raw_options = options if isinstance(options, dict) else {}
    return {
        "max_string_len": _coerce_positive_int(
            raw_options.get("max_string_len"), MAX_STRING_LEN, 1
        ),
        "max_data_field_len": _coerce_positive_int(
            raw_options.get("max_data_field_len"),
            MAX_DATA_FIELD_LEN,
            1,
        ),
        "target_document_size_kb": _coerce_positive_int(
            raw_options.get("target_document_size_kb"),
            TARGET_DOCUMENT_SIZE_BYTES // 1024,
            1,
        ),
        "initial_array_limit": _coerce_positive_int(
            raw_options.get("initial_array_limit"),
            INITIAL_ARRAY_LIMIT,
            1,
        ),
        "min_array_limit": _coerce_positive_int(
            raw_options.get("min_array_limit"),
            MIN_ARRAY_LIMIT,
            1,
        ),
        "object_key_factor": _coerce_positive_int(
            raw_options.get("object_key_factor"),
            OBJECT_KEY_FACTOR,
            1,
        ),
    }


def _serialize_size_bytes(value: Any) -> int:
    return len(
        json.dumps(
            value, ensure_ascii=False, separators=(",", ":"), default=str
        ).encode("utf-8")
    )


def _truncate_scalar(
    value: Any,
    field_name: Optional[str],
    *,
    max_string_len: int,
    max_data_field_len: int,
) -> Any:
    if not isinstance(value, str):
        return value

    max_length = max_string_len
    if field_name and any(
        token in field_name.lower() for token in LONG_DATA_FIELD_TOKENS
    ):
        max_length = max_data_field_len
    return _truncate_string(value, max_length)


def _trim_structure(
    value: Any,
    *,
    array_limit: int,
    object_key_limit: int,
    max_string_len: int,
    max_data_field_len: int,
    field_name: Optional[str] = None,
) -> Any:
    scalar_value = _truncate_scalar(
        value,
        field_name,
        max_string_len=max_string_len,
        max_data_field_len=max_data_field_len,
    )
    if isinstance(scalar_value, str):
        return scalar_value

    if isinstance(value, list):
        processed_items: List[Any] = [
            _trim_structure(
                item,
                array_limit=array_limit,
                object_key_limit=object_key_limit,
                max_string_len=max_string_len,
                max_data_field_len=max_data_field_len,
            )
            for item in value[:array_limit]
        ]
        if len(value) > array_limit:
            processed_items.append({"__truncated_items__": len(value) - array_limit})
        return processed_items

    if isinstance(value, dict):
        result: Dict[str, Any] = {}
        keys = list(value.keys())
        for key in keys[:object_key_limit]:
            string_key = str(key)
            result[string_key] = _trim_structure(
                value[key],
                array_limit=array_limit,
                object_key_limit=object_key_limit,
                max_string_len=max_string_len,
                max_data_field_len=max_data_field_len,
                field_name=string_key,
            )
        if len(keys) > object_key_limit:
            result["__truncated_keys__"] = len(keys) - object_key_limit
        return result

    if isinstance(value, tuple):
        return _trim_structure(
            list(value),
            array_limit=array_limit,
            object_key_limit=object_key_limit,
            max_string_len=max_string_len,
            max_data_field_len=max_data_field_len,
            field_name=field_name,
        )

    return value


def preprocess_data_for_ai(
    value: Any,
    depth: int = 0,
    preprocess_options: Optional[Dict[str, Any]] = None,
) -> Any:
    del depth  # Kept for backward compatibility with older call sites.
    options = _resolve_preprocess_options(preprocess_options)
    target_document_size_bytes = options["target_document_size_kb"] * 1024
    initial_array_limit = options["initial_array_limit"]
    min_array_limit = min(options["min_array_limit"], initial_array_limit)
    object_key_factor = options["object_key_factor"]
    max_string_len = options["max_string_len"]
    max_data_field_len = options["max_data_field_len"]

    # Fast path for already small values after scalar truncation.
    initial = _trim_structure(
        value,
        array_limit=initial_array_limit,
        object_key_limit=initial_array_limit * object_key_factor,
        max_string_len=max_string_len,
        max_data_field_len=max_data_field_len,
    )
    if _serialize_size_bytes(initial) <= target_document_size_bytes:
        return initial

    array_limit = initial_array_limit
    latest = initial
    while array_limit >= min_array_limit:
        candidate = _trim_structure(
            value,
            array_limit=array_limit,
            object_key_limit=array_limit * object_key_factor,
            max_string_len=max_string_len,
            max_data_field_len=max_data_field_len,
        )
        latest = candidate
        if _serialize_size_bytes(candidate) <= target_document_size_bytes:
            return candidate
        if array_limit == min_array_limit:
            break
        array_limit = max(min_array_limit, array_limit // 2)

    return latest
