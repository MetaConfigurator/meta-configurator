from __future__ import annotations

import json
import os

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.middleware.proxy_fix import ProxyFix

from detection_service import detect_format_and_parse, preprocess_parsed_data_for_ai

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


def is_payload_length_valid(value) -> bool:
    if isinstance(value, str):
        serialized = value
    else:
        serialized = json.dumps(value, ensure_ascii=False, default=str)
    return len(serialized.encode("utf-8")) <= MAX_FILE_LENGTH


@app.errorhandler(RequestEntityTooLarge)
def request_too_large(_error):
    return jsonify({"error": "Request body too large"}), 413


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/detect-format-and-parse", methods=["POST"])
@limiter.limit("20 per minute")
def detect_format_and_parse_route():
    try:
        request_data = request.get_json(silent=True)
        if not request_data:
            return jsonify({"error": "Missing request data"}), 400

        if "content" not in request_data:
            return jsonify({"error": 'Missing required field "content"'}), 400

        file_name = request_data.get("file_name", "")
        file_type = request_data.get("file_type", "")
        content = request_data.get("content", "")
        preprocess_options = request_data.get("preprocess_options")

        if not is_payload_length_valid(content):
            return jsonify({"error": "Input file too large"}), 413

        result = detect_format_and_parse(
            file_name=file_name,
            file_type=file_type,
            raw_content=content,
            preprocess_options=preprocess_options,
        )

        return jsonify(
            {
                "recognized": result.recognized,
                "format": result.format,
                "parsed_json": result.parsed_json,
                "preprocessed_for_ai": result.preprocessed_for_ai,
                "message": result.message,
                "display_text": result.display_text,
                "parser_name": result.parser_name,
                "ai_prompt_hint": result.ai_prompt_hint,
            }
        )
    except RequestEntityTooLarge:
        raise
    except Exception as e:
        app.logger.error(f"Error in detect-format-and-parse: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/preprocess-for-ai", methods=["POST"])
@limiter.limit("30 per minute")
def preprocess_for_ai_route():
    try:
        request_data = request.get_json(silent=True)
        if not request_data:
            return jsonify({"error": "Missing request data"}), 400

        if "data" not in request_data:
            return jsonify({"error": 'Missing required field "data"'}), 400

        data = request_data.get("data")
        format_name = request_data.get("format", "json")
        preprocess_options = request_data.get("preprocess_options")

        if not is_payload_length_valid(data):
            return jsonify({"error": "Input data too large"}), 413

        result = preprocess_parsed_data_for_ai(
            parsed_data=data,
            format_name=format_name,
            preprocess_options=preprocess_options,
        )
        return jsonify(result)
    except RequestEntityTooLarge:
        raise
    except Exception as e:
        app.logger.error(f"Error in preprocess-for-ai: {e}")
        return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "5000"))
    app.run(host=host, port=port)
