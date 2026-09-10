"""
pytest configuration — adds the snapshot_sharing/ directory to sys.path so
the `app` module can be imported, and provides a fresh Flask test client per
test with mongomock storage.
"""

import os
import sys
import pathlib
import pytest

# snapshot_sharing/tests/ -> snapshot_sharing/
SERVICE_DIR = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_DIR))

# Must be set before `import app` so the module-level setup picks it up.
os.environ["TESTING"] = "true"


@pytest.fixture
def app_module():
    """Reload `app` per test so each test gets an empty mongomock database."""
    import importlib

    if "app" in sys.modules:
        del sys.modules["app"]
    import app as app_module  # noqa: WPS433  (intentional dynamic import)

    importlib.reload(app_module)
    return app_module


@pytest.fixture
def client(app_module):
    app_module.app.config["TESTING"] = True
    # Rate limits would otherwise reject sequential test requests.
    app_module.limiter.enabled = False
    return app_module.app.test_client()
