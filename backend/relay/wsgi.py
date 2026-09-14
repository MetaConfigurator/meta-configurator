"""
WSGI entry point for Gunicorn.

Loads config.yaml (or the path set in CONFIG_PATH) and creates the Flask app.
"""

import os
from app import create_app, load_config

_config_path = os.environ.get("CONFIG_PATH", "config.yaml")
_cfg = load_config(_config_path)
application = create_app(_cfg)
