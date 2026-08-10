from typing import Any, Dict, Optional

from preprocess import preprocess_data_for_ai as _preprocess_data_for_ai


def preprocess_data_for_ai(
    parsed_file: Any,
    preprocess_options: Optional[Dict[str, Any]] = None,
) -> Any:
    return _preprocess_data_for_ai(parsed_file, preprocess_options=preprocess_options)
