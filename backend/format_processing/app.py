from __future__ import annotations

import os

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.middleware.proxy_fix import ProxyFix

from detection_service import detect_format_and_parse, preprocess_parsed_data_for_ai

app = Flask(__name__)

LOCAL_DEV_ORIGINS = [
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


def _allowed_origins() -> list[str]:
    configured_origins = [
        origin.strip()
        for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
        if origin.strip()
    ]
    default_origins = [
        "https://metaconfigurator.github.io",
        "https://logende.github.io",
        "https://www.metaconfigurator.org",
        "https://metaconfigurator.org",
        "https://metaconfigurator.informatik.uni-stuttgart.de",
    ]

    ordered_origins: list[str] = []
    for origin in LOCAL_DEV_ORIGINS + configured_origins + default_origins:
        if origin not in ordered_origins:
            ordered_origins.append(origin)
    return ordered_origins


app.config["PREFERRED_URL_SCHEME"] = "https"
app.config["PROXY_FIX_X_FOR"] = 1
app.config["PROXY_FIX_X_PROTO"] = 1
app.config["PROXY_FIX_X_HOST"] = 1

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

limiter = Limiter(get_remote_address, app=app)

MAX_FILE_LENGTH = 500000  # 500 KB


def is_file_length_valid(file_content):
    return len(str(file_content)) <= MAX_FILE_LENGTH


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/detect-format-and-parse", methods=["POST"])
@limiter.limit("20 per minute")
def detect_format_and_parse_route():
    try:
        request_data = request.json
        if not request_data:
            return jsonify({"error": "Missing request data"}), 400

        if "content" not in request_data:
            return jsonify({"error": 'Missing required field "content"'}), 400

        file_name = request_data.get("file_name", "")
        file_type = request_data.get("file_type", "")
        content = request_data.get("content", "")
        preprocess_options = request_data.get("preprocess_options")

        if not is_file_length_valid(content):
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
    except Exception as e:
        app.logger.error(f"Error in detect-format-and-parse: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/preprocess-for-ai", methods=["POST"])
@limiter.limit("30 per minute")
def preprocess_for_ai_route():
    try:
        request_data = request.json
        if not request_data:
            return jsonify({"error": "Missing request data"}), 400

        if "data" not in request_data:
            return jsonify({"error": 'Missing required field "data"'}), 400

        data = request_data.get("data")
        format_name = request_data.get("format", "json")
        preprocess_options = request_data.get("preprocess_options")

        result = preprocess_parsed_data_for_ai(
            parsed_data=data,
            format_name=format_name,
            preprocess_options=preprocess_options,
        )
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error in preprocess-for-ai: {e}")
        return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "5000"))
    app.run(host=host, port=port)

