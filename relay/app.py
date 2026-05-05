"""
MetaConfigurator Relay

A self-hosted authenticated HTTP relay/proxy that accepts requests from
MetaConfigurator, routes them to one of several configured upstream LLM
endpoints based on the requested model, and returns the upstream response.

Configuration is loaded from a YAML file (default: config.yaml).
"""

from __future__ import annotations

import json
import logging
import os
import sys
import time
from dataclasses import dataclass, field
from typing import Callable, Optional

import requests
import yaml
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter

# ---------------------------------------------------------------------------
# Config dataclasses
# ---------------------------------------------------------------------------


@dataclass
class EndpointConfig:
    name: str
    url: str
    api_key: str
    auth_header: str = "Authorization"
    auth_prefix: str = "Bearer"
    extra_headers: dict[str, str] = field(default_factory=dict)


@dataclass
class RateLimitConfig:
    enabled: bool
    requests_per_minute: int
    requests_per_hour: int
    requests_per_day: int


@dataclass
class LimitsConfig:
    max_request_tokens: int
    max_daily_tokens_per_ip: int
    max_request_bytes: int


@dataclass
class RelayConfig:
    endpoints: list[EndpointConfig]
    rate_limits: RateLimitConfig
    limits: LimitsConfig
    relay_password: str = ""
    allowed_origins: list[str] = field(default_factory=list)
    request_timeout: int = 180
    enable_streaming: bool = True
    enable_models_proxy: bool = True
    log_level: str = "INFO"


# ---------------------------------------------------------------------------
# Config loader
# ---------------------------------------------------------------------------


def load_config(path: str) -> RelayConfig:
    if not os.path.exists(path):
        print(f"ERROR: Config file not found: {path}", file=sys.stderr)
        print(
            "Copy config.example.yaml to config.yaml and fill in your values.",
            file=sys.stderr,
        )
        sys.exit(1)

    with open(path, "r") as fh:
        raw = yaml.safe_load(fh) or {}

    if "endpoints" not in raw or not raw["endpoints"]:
        print("ERROR: config.yaml must contain at least one endpoint under 'endpoints:'", file=sys.stderr)
        sys.exit(1)

    endpoints: list[EndpointConfig] = []
    for ep in raw["endpoints"]:
        if "name" not in ep or "url" not in ep:
            print("ERROR: Each endpoint must have 'name' and 'url' fields.", file=sys.stderr)
            sys.exit(1)
        endpoints.append(
            EndpointConfig(
                name=ep["name"],
                url=ep["url"].rstrip("/"),
                api_key=ep.get("api_key", ""),
                auth_header=ep.get("auth_header", "Authorization"),
                auth_prefix=ep.get("auth_prefix", "Bearer"),
                extra_headers=ep.get("extra_headers") or {},
            )
        )

    rl_raw = raw.get("rate_limits", {})
    rate_limits = RateLimitConfig(
        enabled=rl_raw.get("enabled", True),
        requests_per_minute=rl_raw.get("requests_per_minute", 20),
        requests_per_hour=rl_raw.get("requests_per_hour", 200),
        requests_per_day=rl_raw.get("requests_per_day", 1000),
    )

    lim_raw = raw.get("limits", {})
    limits = LimitsConfig(
        max_request_tokens=lim_raw.get("max_request_tokens", 10000),
        max_daily_tokens_per_ip=lim_raw.get("max_daily_tokens_per_ip", 100000),
        max_request_bytes=lim_raw.get("max_request_bytes", 2 * 1024 * 1024),
    )

    # Support allowed_origins (list) and allowed_origin (singular string, backward compat)
    ao_raw = raw.get("allowed_origins") or raw.get("allowed_origin", "")
    if isinstance(ao_raw, str):
        allowed_origins: list[str] = [ao_raw.strip()] if ao_raw.strip() else []
    elif isinstance(ao_raw, list):
        allowed_origins = [o for o in ao_raw if isinstance(o, str) and o.strip()]
    else:
        allowed_origins = []

    return RelayConfig(
        endpoints=endpoints,
        rate_limits=rate_limits,
        limits=limits,
        relay_password=raw.get("relay_password", ""),
        allowed_origins=allowed_origins,
        request_timeout=raw.get("request_timeout", 180),
        enable_streaming=raw.get("enable_streaming", True),
        enable_models_proxy=raw.get("enable_models_proxy", True),
        log_level=raw.get("log_level", "INFO").upper(),
    )


# ---------------------------------------------------------------------------
# Endpoint routing
# ---------------------------------------------------------------------------


def find_endpoint(
    endpoints: list[EndpointConfig],
    target_url: Optional[str] = None,
) -> Optional[EndpointConfig]:
    """Resolve which configured endpoint to use for a request.

    If *target_url* is provided (from the X-Relay-Endpoint header), the first
    endpoint whose URL is a prefix match wins.  Returns None if a URL was
    given but no endpoint matches (prevents silent misrouting).

    If no URL is provided, falls back to the first configured endpoint.
    """
    if target_url:
        normalized = target_url.rstrip("/")
        for ep in endpoints:
            if normalized == ep.url or normalized.startswith(ep.url + "/"):
                return ep
        return None  # URL given but no match — refuse rather than misroute
    return endpoints[0] if endpoints else None


# ---------------------------------------------------------------------------
# Token tracker (per-IP daily cap, uses max_tokens as estimate)
# No library covers this use-case; kept as a lightweight custom class.
# ---------------------------------------------------------------------------


class TokenTracker:
    def __init__(self, cfg: LimitsConfig, now_fn: Callable[[], float] = time.time):
        self._cfg = cfg
        self._now = now_fn
        # ip -> list of (unix_timestamp, tokens_used)
        self._usage: dict[str, list[tuple[float, int]]] = {}

    def check_and_track(self, ip: str, requested_tokens: int) -> tuple[int, bool]:
        """Cap requested_tokens to max_request_tokens, check daily limit.

        Returns (capped_tokens, allowed).
        Set max_daily_tokens_per_ip to 0 in config to disable daily tracking.
        """
        capped = min(requested_tokens, self._cfg.max_request_tokens)
        # 0 means "no daily token limit"
        if self._cfg.max_daily_tokens_per_ip <= 0:
            return capped, True
        now = self._now()
        cutoff = now - 86400
        entries = self._usage.setdefault(ip, [])
        self._usage[ip] = [(ts, tok) for ts, tok in entries if ts >= cutoff]
        used_today = sum(tok for _, tok in self._usage[ip])
        if used_today + capped > self._cfg.max_daily_tokens_per_ip:
            return capped, False
        self._usage[ip].append((now, capped))
        return capped, True


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------


def create_app(config: RelayConfig) -> Flask:
    logging.basicConfig(
        level=getattr(logging, config.log_level, logging.INFO),
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
        stream=sys.stdout,
    )
    log = logging.getLogger(__name__)

    token_tracker = TokenTracker(config.limits)

    app = Flask(__name__)

    # -----------------------------------------------------------------------
    # CORS (flask-cors)
    # -----------------------------------------------------------------------

    origins = config.allowed_origins if config.allowed_origins else "*"
    CORS(
        app,
        origins=origins,
        allow_headers=["Authorization", "Content-Type", "X-Relay-Endpoint"],
        methods=["GET", "POST", "OPTIONS"],
        max_age=86400,
    )

    # -----------------------------------------------------------------------
    # Rate limiting (flask-limiter, in-memory sliding window)
    # -----------------------------------------------------------------------

    def _client_ip() -> str:
        return request.remote_addr or ""

    rl = config.rate_limits
    default_limits = (
        [
            f"{rl.requests_per_minute} per minute",
            f"{rl.requests_per_hour} per hour",
            f"{rl.requests_per_day} per day",
        ]
        if rl.enabled
        else []
    )

    limiter = Limiter(
        key_func=_client_ip,
        app=app,
        default_limits=default_limits,
        storage_uri="memory://",
    )

    @app.errorhandler(429)
    def _rate_limit_error(e):
        return jsonify({"error": {"message": "Rate limit exceeded", "type": "rate_limit_error"}}), 429

    # -----------------------------------------------------------------------
    # Helpers
    # -----------------------------------------------------------------------

    def _log(method: str, path: str, status: int, duration: float, model: Optional[str] = None) -> None:
        parts = [
            f"method={method}",
            f"path={path}",
            f"ip={_client_ip()}",
            f"status={status}",
            f"duration={duration:.3f}s",
        ]
        if model:
            parts.append(f"model={model}")
        log.info(" ".join(parts))

    def _error(message: str, error_type: str, status: int) -> tuple[Response, int]:
        return jsonify({"error": {"message": message, "type": error_type}}), status

    def _parse_max_tokens(value: object) -> tuple[Optional[int], Optional[Response]]:
        if value is None:
            return config.limits.max_request_tokens, None
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            return None, _error("max_tokens must be an integer", "relay_error", 400)[0]
        if parsed < 0:
            return None, _error("max_tokens must be non-negative", "relay_error", 400)[0]
        return parsed, None

    def _upstream_headers(ep: EndpointConfig) -> dict[str, str]:
        prefix = ep.auth_prefix
        auth_value = f"{prefix} {ep.api_key}".strip() if prefix else ep.api_key
        headers: dict[str, str] = {ep.auth_header: auth_value, "Content-Type": "application/json"}
        accept = request.headers.get("Accept")
        if accept:
            headers["Accept"] = accept
        headers.update(ep.extra_headers)
        return headers

    # -----------------------------------------------------------------------
    # Authentication
    # -----------------------------------------------------------------------

    def _check_auth() -> Optional[Response]:
        if not config.relay_password:
            return None  # open relay
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return _error("Missing or invalid Authorization header", "relay_auth_error", 401)[0]
        token = auth_header[len("Bearer "):]
        if token != config.relay_password:
            return _error("Invalid relay password", "relay_auth_error", 401)[0]
        return None

    # -----------------------------------------------------------------------
    # Health
    # -----------------------------------------------------------------------

    @app.route("/health")
    @limiter.exempt
    def health() -> Response:
        return jsonify({"ok": True, "endpoints": len(config.endpoints)})

    # -----------------------------------------------------------------------
    # Models
    # -----------------------------------------------------------------------

    @app.route("/v1/models", methods=["GET"])
    def models() -> tuple[Response, int] | Response:
        auth_err = _check_auth()
        if auth_err:
            return auth_err, 401

        if not config.enable_models_proxy:
            return _error("Models endpoint disabled", "relay_error", 404)

        ep = find_endpoint(config.endpoints)
        if ep is None:
            return _error("No endpoint configured", "relay_routing_error", 500)

        url = f"{ep.url}/models"
        start = time.monotonic()
        try:
            resp = requests.get(url, headers=_upstream_headers(ep), timeout=config.request_timeout)
            _log("GET", "/v1/models", resp.status_code, time.monotonic() - start)
            return Response(
                resp.content,
                status=resp.status_code,
                content_type=resp.headers.get("Content-Type", "application/json"),
            )
        except requests.Timeout:
            _log("GET", "/v1/models", 504, time.monotonic() - start)
            return _error("Upstream timeout", "relay_error", 504)
        except requests.ConnectionError:
            _log("GET", "/v1/models", 502, time.monotonic() - start)
            return _error("Upstream connection failed", "relay_error", 502)

    # -----------------------------------------------------------------------
    # Generic POST proxy
    # -----------------------------------------------------------------------

    def _proxy_post(upstream_path: str) -> tuple[Response, int] | Response:
        auth_err = _check_auth()
        if auth_err:
            return auth_err, 401

        ip = _client_ip()

        # Body size check
        content_length = request.content_length
        if content_length is not None and content_length > config.limits.max_request_bytes:
            return _error("Request body too large", "relay_error", 413)

        body = request.get_data()
        if len(body) > config.limits.max_request_bytes:
            return _error("Request body too large", "relay_error", 413)

        # Parse body for model, stream flag, and max_tokens
        model: Optional[str] = None
        is_stream = False
        parsed: dict = {}
        try:
            parsed = json.loads(body)
            if not isinstance(parsed, dict):
                return _error("Request body must be a JSON object", "relay_error", 400)
            model = parsed.get("model")
            if config.enable_streaming:
                is_stream = bool(parsed.get("stream", False))
        except json.JSONDecodeError:
            return _error("Invalid JSON body", "relay_error", 400)

        # Endpoint routing — match X-Relay-Endpoint URL, fall back to first endpoint
        target_url = request.headers.get("X-Relay-Endpoint", "").strip() or None
        ep = find_endpoint(config.endpoints, target_url)
        if ep is None:
            return _error(
                f"No configured endpoint matches upstream URL '{target_url}'",
                "relay_routing_error",
                400,
            )

        # Token cap + daily limit
        raw_max_tokens, token_parse_err = _parse_max_tokens(parsed.get("max_tokens"))
        if token_parse_err:
            return token_parse_err, 400
        capped_tokens, token_ok = token_tracker.check_and_track(ip, raw_max_tokens)
        if not token_ok:
            return _error("Daily token limit exceeded for your IP", "token_limit_error", 429)
        if capped_tokens != raw_max_tokens:
            parsed["max_tokens"] = capped_tokens
            body = json.dumps(parsed).encode()

        url = f"{ep.url}{upstream_path}"
        start = time.monotonic()
        try:
            upstream_resp = requests.post(
                url,
                headers=_upstream_headers(ep),
                data=body,
                timeout=config.request_timeout,
                stream=is_stream,
            )
        except requests.Timeout:
            _log("POST", upstream_path, 504, time.monotonic() - start, model)
            return _error("Upstream timeout", "relay_error", 504)
        except requests.ConnectionError:
            _log("POST", upstream_path, 502, time.monotonic() - start, model)
            return _error("Upstream connection failed", "relay_error", 502)
        except requests.RequestException:
            _log("POST", upstream_path, 502, time.monotonic() - start, model)
            return _error("Upstream request failed", "relay_error", 502)

        if is_stream:
            content_type = upstream_resp.headers.get("Content-Type", "text/event-stream")
            status = upstream_resp.status_code

            def generate():
                try:
                    for chunk in upstream_resp.iter_content(chunk_size=None):
                        if chunk:
                            yield chunk
                finally:
                    upstream_resp.close()
                    _log("POST", upstream_path, status, time.monotonic() - start, model)

            return Response(
                generate(),
                status=status,
                content_type=content_type,
                headers={"X-Accel-Buffering": "no"},
            )

        _log("POST", upstream_path, upstream_resp.status_code, time.monotonic() - start, model)
        return Response(
            upstream_resp.content,
            status=upstream_resp.status_code,
            content_type=upstream_resp.headers.get("Content-Type", "application/json"),
        )

    # -----------------------------------------------------------------------
    # Completion routes
    # -----------------------------------------------------------------------

    @app.route("/v1/chat/completions", methods=["POST"])
    def chat_completions() -> tuple[Response, int] | Response:
        return _proxy_post("/chat/completions")

    @app.route("/v1/completions", methods=["POST"])
    def completions() -> tuple[Response, int] | Response:
        return _proxy_post("/completions")

    @app.route("/v1/embeddings", methods=["POST"])
    def embeddings() -> tuple[Response, int] | Response:
        return _proxy_post("/embeddings")

    @app.route("/v1/responses", methods=["POST"])
    def responses() -> tuple[Response, int] | Response:
        return _proxy_post("/responses")

    return app


# ---------------------------------------------------------------------------
# Entry point (development only — use Gunicorn in production/Docker)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    config_path = os.environ.get("CONFIG_PATH", "config.yaml")
    cfg = load_config(config_path)
    flask_app = create_app(cfg)
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8080"))
    logging.getLogger(__name__).info("MC Relay starting on %s:%d (development server)", host, port)
    flask_app.run(host=host, port=port, debug=False)
