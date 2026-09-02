from __future__ import annotations

import json
import os
from dataclasses import asdict
from functools import wraps
from typing import Any, Callable, Dict

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.middleware.proxy_fix import ProxyFix

from detection_service import detect_format_and_parse

app = Flask(__name__)

DEFAULT_CORS_ORIGINS = [
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://metaconfigurator.github.io",
    "https://logende.github.io",
    "https://www.metaconfigurator.org",
    "https://metaconfigurator.org",
    "https://metaconfigurator.informatik.uni-stuttgart.de",
]

MAX_FILE_LENGTH = int(os.getenv("MAX_FILE_LENGTH", "500000"))
MAX_REQUEST_LENGTH = int(os.getenv("MAX_REQUEST_LENGTH", "1000000"))


def _allowed_origins() -> list[str]:
    configured = os.getenv("CORS_ALLOWED_ORIGINS")
    candidates = (
        configured.split(",") if configured is not None else DEFAULT_CORS_ORIGINS
    )

    ordered_origins: list[str] = []
    for raw_origin in candidates:
        origin = raw_origin.strip()
        if origin and origin not in ordered_origins:
            ordered_origins.append(origin)
    return ordered_origins


app.config["PREFERRED_URL_SCHEME"] = "https"
app.config["PROXY_FIX_X_FOR"] = 1
app.config["PROXY_FIX_X_PROTO"] = 1
app.config["PROXY_FIX_X_HOST"] = 1
app.config["MAX_CONTENT_LENGTH"] = MAX_REQUEST_LENGTH

app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

CORS(
    app,
    resources={
        r"/*": {
            "origins": _allowed_origins(),
            "supports_credentials": True,
        }
    },
)

limiter = Limiter(
    get_remote_address,
    app=app,
    storage_uri=os.getenv("RATELIMIT_STORAGE_URI", "memory://"),
)


def _is_within_file_size_limit(value: Any) -> bool:
    if isinstance(value, str):
        serialized = value
    else:
        serialized = json.dumps(value, ensure_ascii=False, default=str)
    return len(serialized.encode("utf-8")) <= MAX_FILE_LENGTH


class _InvalidRequest(Exception):
    """A client error carrying the message and status code to return."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _read_import_request() -> Dict[str, Any]:
    """Returns the JSON body once the file content is present and small enough."""
    request_data = request.get_json(silent=True)
    if not request_data:
        raise _InvalidRequest("Missing request data")
    if not isinstance(request_data, dict):
        raise _InvalidRequest("Request data must be a JSON object")
    if "content" not in request_data:
        raise _InvalidRequest('Missing required field "content"')
    if not _is_within_file_size_limit(request_data["content"]):
        raise _InvalidRequest("Input file too large", 413)
    return request_data


def _handle_json_route_errors(view_function: Callable) -> Callable:
    """Answers client errors with their JSON message and hides unexpected errors."""

    @wraps(view_function)
    def wrapped_view(*args, **kwargs):
        try:
            return view_function(*args, **kwargs)
        except _InvalidRequest as invalid_request:
            return (
                jsonify({"error": invalid_request.message}),
                invalid_request.status_code,
            )
        except RequestEntityTooLarge:
            raise
        except Exception:
            app.logger.exception("Unhandled error while processing %s", request.path)
            return jsonify({"error": "Internal server error"}), 500

    return wrapped_view


@app.errorhandler(RequestEntityTooLarge)
def request_too_large(_error):
    return jsonify({"error": "Request body too large"}), 413


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/detect-format-and-parse", methods=["POST"])
@limiter.limit("20 per minute")
@_handle_json_route_errors
def detect_format_and_parse_route():
    request_data = _read_import_request()

    result = detect_format_and_parse(
        file_name=request_data.get("file_name", ""),
        file_type=request_data.get("file_type", ""),
        raw_content=request_data["content"],
        preprocess_options=request_data.get("preprocess_options"),
    )

    return jsonify(asdict(result))


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "5000"))
    app.run(host=host, port=port)
