"""Public detection entry point for the import backend package."""

from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from detection_service import detect_format_and_parse
from format_detection_core import gemmi, xmltodict, yaml
from models import DetectionResult

__all__ = ['DetectionResult', 'detect_format_and_parse', 'gemmi', 'xmltodict', 'yaml']

