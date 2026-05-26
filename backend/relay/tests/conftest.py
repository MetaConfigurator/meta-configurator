"""
pytest configuration — adds the relay/ directory to sys.path so that
`from app import ...` works in tests without needing an installed package.
"""

import sys
import os

# relay/tests/ -> relay/
relay_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if relay_dir not in sys.path:
    sys.path.insert(0, relay_dir)
