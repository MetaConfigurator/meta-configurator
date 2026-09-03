"""Public detection entry point for the format processing service package.

The service modules import each other by their flat module names, so the service directory
has to be importable even when this module is imported as backend.format_processing.
"""

import sys
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parent
if str(SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(SERVICE_DIR))

from detection_service import detect_format_and_parse  # noqa: E402
from format_detection_core import gemmi, xmltodict, yaml  # noqa: E402
from models import DetectionResult  # noqa: E402

__all__ = ["DetectionResult", "detect_format_and_parse", "gemmi", "xmltodict", "yaml"]
