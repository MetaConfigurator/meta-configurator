"""
pytest configuration — adds the format_processing/ directory to sys.path so that
`import app` and `from format_detection import ...` work in tests without needing
an installed package.
"""

import os
import sys

# format_processing/tests/ -> format_processing/
service_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if service_dir not in sys.path:
    sys.path.insert(0, service_dir)
