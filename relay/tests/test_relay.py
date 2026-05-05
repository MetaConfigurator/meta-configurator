"""
Comprehensive tests for the MetaConfigurator Relay.

Uses Flask test client for integration tests and the `responses` library to
mock upstream HTTP calls without real network access.
"""

import json
import time
from typing import Any

import pytest
import responses as rsps_lib

from app import (
    EndpointConfig,
    LimitsConfig,
    RateLimitConfig,
    RelayConfig,
    create_app,
    find_endpoint,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

UPSTREAM = "https://test-upstream.example.com/v1"

_DEFAULT_ENDPOINT = EndpointConfig(
    name="test",
    url=UPSTREAM,
    api_key="upstream-secret-key",
)


def make_config(**overrides: Any) -> RelayConfig:
    """Return a RelayConfig suitable for isolated tests.

    Rate limiting is disabled by default so tests don't interfere with each
    other through shared state.  Pass rate_limits= to override.
    """
    defaults: dict[str, Any] = dict(
        endpoints=[_DEFAULT_ENDPOINT],
        rate_limits=RateLimitConfig(enabled=False, requests_per_minute=20, requests_per_hour=200, requests_per_day=1000),
        limits=LimitsConfig(
            max_request_tokens=10000,
            max_daily_tokens_per_ip=100000,
            max_request_bytes=2 * 1024 * 1024,
        ),
        relay_password="",
        allowed_origins=[],
        request_timeout=10,
        enable_streaming=True,
        enable_models_proxy=True,
        log_level="ERROR",
    )
    defaults.update(overrides)
    return RelayConfig(**defaults)


def _post_json(client, path: str, body: dict, headers: dict | None = None):
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    return client.post(path, data=json.dumps(body), headers=h)


# ===========================================================================
# 1. Health
# ===========================================================================


def test_health_returns_ok():
    app = create_app(make_config())
    with app.test_client() as client:
        resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["ok"] is True


def test_health_shows_endpoint_count():
    cfg = make_config(
        endpoints=[
            EndpointConfig(name="a", url=UPSTREAM, api_key="k1"),
            EndpointConfig(name="b", url=UPSTREAM, api_key="k2"),
        ]
    )
    app = create_app(cfg)
    with app.test_client() as client:
        resp = client.get("/health")
    assert resp.get_json()["endpoints"] == 2


# ===========================================================================
# 2. Authentication
# ===========================================================================


@rsps_lib.activate
def test_no_password_allows_unauthenticated():
    rsps_lib.add(rsps_lib.POST, f"{UPSTREAM}/chat/completions", json={"choices": []}, status=200)
    app = create_app(make_config(relay_password=""))
    with app.test_client() as client:
        resp = _post_json(client, "/v1/chat/completions", {"model": "gpt-4o", "messages": []})
    assert resp.status_code == 200


def test_password_rejects_missing_auth():
    app = create_app(make_config(relay_password="secret"))
    with app.test_client() as client:
        resp = _post_json(client, "/v1/chat/completions", {"model": "gpt-4o", "messages": []})
    assert resp.status_code == 401


def test_password_rejects_wrong_token():
    app = create_app(make_config(relay_password="secret"))
    with app.test_client() as client:
        resp = _post_json(
            client,
            "/v1/chat/completions",
            {"model": "gpt-4o", "messages": []},
            headers={"Authorization": "Bearer wrong-password"},
        )
    assert resp.status_code == 401


@rsps_lib.activate
def test_password_accepts_correct_token():
    rsps_lib.add(rsps_lib.POST, f"{UPSTREAM}/chat/completions", json={"choices": []}, status=200)
    app = create_app(make_config(relay_password="secret"))
    with app.test_client() as client:
        resp = _post_json(
            client,
            "/v1/chat/completions",
            {"model": "gpt-4o", "messages": []},
            headers={"Authorization": "Bearer secret"},
        )
    assert resp.status_code == 200


def test_auth_error_has_relay_error_type():
    app = create_app(make_config(relay_password="secret"))
    with app.test_client() as client:
        resp = _post_json(client, "/v1/chat/completions", {"model": "gpt-4o", "messages": []})
    data = resp.get_json()
    assert data["error"]["type"] == "relay_auth_error"


# ===========================================================================
# 3. Request forwarding
# ===========================================================================


@rsps_lib.activate
def test_chat_completion_forwarded():
    expected = {"id": "chatcmpl-abc", "choices": [{"message": {"content": "Hello"}}]}
    rsps_lib.add(rsps_lib.POST, f"{UPSTREAM}/chat/completions", json=expected, status=200)

    app = create_app(make_config())
    with app.test_client() as client:
        resp = _post_json(
            client,
            "/v1/chat/completions",
            {"model": "gpt-4o", "messages": [{"role": "user", "content": "Hi"}]},
        )
    assert resp.status_code == 200
    assert resp.get_json()["id"] == "chatcmpl-abc"


@rsps_lib.activate
def test_upstream_api_key_injected_not_client_key():
    """The upstream must receive the endpoint's api_key, not the relay password."""
    captured_headers: dict = {}

    def _callback(request):
        captured_headers.update(dict(request.headers))
        return (200, {}, json.dumps({"choices": []}))

    rsps_lib.add_callback(rsps_lib.POST, f"{UPSTREAM}/chat/completions", callback=_callback)

    app = create_app(make_config(relay_password="relay-pass"))
    with app.test_client() as client:
        _post_json(
            client,
            "/v1/chat/completions",
            {"model": "gpt-4o", "messages": []},
            headers={"Authorization": "Bearer relay-pass"},
        )

    assert captured_headers.get("Authorization") == f"Bearer {_DEFAULT_ENDPOINT.api_key}"
    # The relay password must NOT appear in what we send upstream
    assert "relay-pass" not in captured_headers.get("Authorization", "")


@rsps_lib.activate
def test_upstream_error_passed_through():
    rsps_lib.add(rsps_lib.POST, f"{UPSTREAM}/chat/completions", json={"error": "bad key"}, status=401)

    app = create_app(make_config())
    with app.test_client() as client:
        resp = _post_json(client, "/v1/chat/completions", {"model": "gpt-4o", "messages": []})
    assert resp.status_code == 401


# ===========================================================================
# 4. Endpoint routing (unit tests)
# ===========================================================================


def test_url_routing_matches_exact_url():
    ep_perplexity = EndpointConfig(name="perplexity", url="https://api.perplexity.ai", api_key="pplx-key")
    ep_openai = EndpointConfig(name="openai", url="https://api.openai.com/v1", api_key="sk-key")

    assert find_endpoint([ep_perplexity, ep_openai], "https://api.perplexity.ai") is ep_perplexity
    assert find_endpoint([ep_perplexity, ep_openai], "https://api.openai.com/v1") is ep_openai


def test_url_routing_matches_with_trailing_slash():
    ep = EndpointConfig(name="openai", url="https://api.openai.com/v1", api_key="k")
    assert find_endpoint([ep], "https://api.openai.com/v1/") is ep


def test_url_routing_unknown_url_returns_none():
    ep = EndpointConfig(name="openai", url="https://api.openai.com/v1", api_key="k")
    assert find_endpoint([ep], "https://some-other-provider.com/v1") is None


def test_no_url_falls_back_to_first_endpoint():
    ep1 = EndpointConfig(name="first", url="https://a.example.com/v1", api_key="k1")
    ep2 = EndpointConfig(name="second", url="https://b.example.com/v1", api_key="k2")
    assert find_endpoint([ep1, ep2]) is ep1


@rsps_lib.activate
def test_x_relay_endpoint_header_routes_correctly():
    """Integration: X-Relay-Endpoint header routes to the matching upstream."""
    perplexity_upstream = "https://api.perplexity.ai"
    openai_upstream = "https://api.openai.com/v1"

    rsps_lib.add(rsps_lib.POST, f"{perplexity_upstream}/chat/completions", json={"choices": []}, status=200)

    ep_perplexity = EndpointConfig(name="perplexity", url=perplexity_upstream, api_key="pplx-key")
    ep_openai = EndpointConfig(name="openai", url=openai_upstream, api_key="sk-key")
    cfg = make_config(endpoints=[ep_perplexity, ep_openai])
    app = create_app(cfg)

    with app.test_client() as client:
        resp = _post_json(
            client,
            "/v1/chat/completions",
            {"model": "sonar", "messages": []},
            headers={"X-Relay-Endpoint": perplexity_upstream},
        )
    assert resp.status_code == 200


@rsps_lib.activate
def test_unknown_relay_endpoint_returns_400():
    """If X-Relay-Endpoint doesn't match any configured endpoint, return 400."""
    app = create_app(make_config())
    with app.test_client() as client:
        resp = _post_json(
            client,
            "/v1/chat/completions",
            {"model": "gpt-4o", "messages": []},
            headers={"X-Relay-Endpoint": "https://unknown-provider.example.com/v1"},
        )
    assert resp.status_code == 400
    assert resp.get_json()["error"]["type"] == "relay_routing_error"


@rsps_lib.activate
def test_x_relay_endpoint_header_not_forwarded_upstream():
    """The X-Relay-Endpoint header must not be sent to the upstream provider."""
    captured_headers: dict = {}

    def _callback(req):
        captured_headers.update(dict(req.headers))
        return (200, {}, json.dumps({"choices": []}))

    rsps_lib.add_callback(rsps_lib.POST, f"{UPSTREAM}/chat/completions", callback=_callback)

    app = create_app(make_config())
    with app.test_client() as client:
        _post_json(
            client,
            "/v1/chat/completions",
            {"model": "gpt-4o", "messages": []},
            headers={"X-Relay-Endpoint": UPSTREAM},
        )

    assert "X-Relay-Endpoint" not in captured_headers


# ===========================================================================
# 5. Rate limiting (integration test via flask-limiter)
# ===========================================================================


@rsps_lib.activate
def test_rate_limit_returns_429_when_exceeded():
    # Register enough upstream responses for the allowed requests
    for _ in range(3):
        rsps_lib.add(rsps_lib.POST, f"{UPSTREAM}/chat/completions", json={"choices": []}, status=200)

    rate_cfg = RateLimitConfig(enabled=True, requests_per_minute=2, requests_per_hour=1000, requests_per_day=10000)
    app = create_app(make_config(rate_limits=rate_cfg))

    statuses = []
    with app.test_client() as client:
        for _ in range(4):
            r = _post_json(client, "/v1/chat/completions", {"model": "gpt-4o", "messages": []})
            statuses.append(r.status_code)

    assert statuses[0] == 200
    assert statuses[1] == 200
    assert 429 in statuses[2:]


@rsps_lib.activate
def test_rate_limit_disabled_allows_many_requests():
    for _ in range(10):
        rsps_lib.add(rsps_lib.POST, f"{UPSTREAM}/chat/completions", json={"choices": []}, status=200)

    rate_cfg = RateLimitConfig(enabled=False, requests_per_minute=1, requests_per_hour=1, requests_per_day=1)
    app = create_app(make_config(rate_limits=rate_cfg))

    with app.test_client() as client:
        for _ in range(5):
            r = _post_json(client, "/v1/chat/completions", {"model": "gpt-4o", "messages": []})
            assert r.status_code == 200


def test_rate_limit_error_has_correct_type():
    rate_cfg = RateLimitConfig(enabled=True, requests_per_minute=1, requests_per_hour=1000, requests_per_day=10000)
    app = create_app(make_config(rate_limits=rate_cfg))

    with app.test_client() as client:
        _post_json(client, "/v1/chat/completions", {"model": "gpt-4o", "messages": []})
        resp = _post_json(client, "/v1/chat/completions", {"model": "gpt-4o", "messages": []})

    assert resp.status_code == 429
    assert resp.get_json()["error"]["type"] == "rate_limit_error"


def test_health_is_exempt_from_rate_limiting():
    rate_cfg = RateLimitConfig(enabled=True, requests_per_minute=1, requests_per_hour=1, requests_per_day=1)
    app = create_app(make_config(rate_limits=rate_cfg))

    with app.test_client() as client:
        for _ in range(5):
            resp = client.get("/health")
            assert resp.status_code == 200


# ===========================================================================
# 6. Token limits
# ===========================================================================


@rsps_lib.activate
def test_max_tokens_capped():
    """max_tokens: 99999 in the request should be capped to max_request_tokens."""
    captured_body: list[dict] = []

    def _callback(request):
        captured_body.append(json.loads(request.body))
        return (200, {}, json.dumps({"choices": []}))

    rsps_lib.add_callback(rsps_lib.POST, f"{UPSTREAM}/chat/completions", callback=_callback)

    cfg = make_config(limits=LimitsConfig(max_request_tokens=1000, max_daily_tokens_per_ip=100000, max_request_bytes=2 * 1024 * 1024))
    app = create_app(cfg)
    with app.test_client() as client:
        _post_json(client, "/v1/chat/completions", {"model": "gpt-4o", "messages": [], "max_tokens": 99999})

    assert captured_body[0]["max_tokens"] == 1000


@rsps_lib.activate
def test_max_tokens_within_limit_unchanged():
    captured_body: list[dict] = []

    def _callback(request):
        captured_body.append(json.loads(request.body))
        return (200, {}, json.dumps({"choices": []}))

    rsps_lib.add_callback(rsps_lib.POST, f"{UPSTREAM}/chat/completions", callback=_callback)

    cfg = make_config(limits=LimitsConfig(max_request_tokens=10000, max_daily_tokens_per_ip=100000, max_request_bytes=2 * 1024 * 1024))
    app = create_app(cfg)
    with app.test_client() as client:
        _post_json(client, "/v1/chat/completions", {"model": "gpt-4o", "messages": [], "max_tokens": 500})

    assert captured_body[0]["max_tokens"] == 500


def test_oversized_body_returns_413():
    cfg = make_config(limits=LimitsConfig(max_request_tokens=10000, max_daily_tokens_per_ip=100000, max_request_bytes=100))
    app = create_app(cfg)
    with app.test_client() as client:
        # Build a body larger than 100 bytes
        big_body = json.dumps({"model": "gpt-4o", "messages": [{"role": "user", "content": "x" * 200}]})
        resp = client.post(
            "/v1/chat/completions",
            data=big_body,
            headers={"Content-Type": "application/json"},
        )
    assert resp.status_code == 413


# ===========================================================================
# 7. Upstream errors
# ===========================================================================


@rsps_lib.activate
def test_upstream_timeout_returns_504():
    import requests as req_lib
    rsps_lib.add(rsps_lib.POST, f"{UPSTREAM}/chat/completions", body=req_lib.Timeout())

    app = create_app(make_config())
    with app.test_client() as client:
        resp = _post_json(client, "/v1/chat/completions", {"model": "gpt-4o", "messages": []})
    assert resp.status_code == 504


@rsps_lib.activate
def test_upstream_connection_error_returns_502():
    import requests as req_lib
    rsps_lib.add(rsps_lib.POST, f"{UPSTREAM}/chat/completions", body=req_lib.ConnectionError())

    app = create_app(make_config())
    with app.test_client() as client:
        resp = _post_json(client, "/v1/chat/completions", {"model": "gpt-4o", "messages": []})
    assert resp.status_code == 502


# ===========================================================================
# 8. CORS
# ===========================================================================


@rsps_lib.activate
def test_cors_headers_present():
    rsps_lib.add(rsps_lib.POST, f"{UPSTREAM}/chat/completions", json={"choices": []}, status=200)

    app = create_app(make_config())
    with app.test_client() as client:
        resp = _post_json(
            client,
            "/v1/chat/completions",
            {"model": "gpt-4o", "messages": []},
            headers={"Origin": "http://localhost:5173"},
        )
    assert "Access-Control-Allow-Origin" in resp.headers


def test_preflight_returns_2xx_with_cors_headers():
    app = create_app(make_config())
    with app.test_client() as client:
        resp = client.options(
            "/v1/chat/completions",
            headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"},
        )
    # Flask may return 200 (auto-handler) or 204 (explicit handler); both are valid for CORS
    assert resp.status_code in (200, 204)
    assert "Access-Control-Allow-Methods" in resp.headers


@rsps_lib.activate
def test_cors_restricted_origin_reflected():
    rsps_lib.add(rsps_lib.POST, f"{UPSTREAM}/chat/completions", json={"choices": []}, status=200)

    app = create_app(make_config(allowed_origins=["https://allowed.example.com"]))
    with app.test_client() as client:
        resp = _post_json(
            client,
            "/v1/chat/completions",
            {"model": "gpt-4o", "messages": []},
            headers={"Origin": "https://allowed.example.com"},
        )
    assert resp.headers.get("Access-Control-Allow-Origin") == "https://allowed.example.com"


@rsps_lib.activate
def test_cors_blocked_origin_not_reflected():
    rsps_lib.add(rsps_lib.POST, f"{UPSTREAM}/chat/completions", json={"choices": []}, status=200)

    app = create_app(make_config(allowed_origins=["https://allowed.example.com"]))
    with app.test_client() as client:
        resp = _post_json(
            client,
            "/v1/chat/completions",
            {"model": "gpt-4o", "messages": []},
            headers={"Origin": "https://evil.example.com"},
        )
    assert resp.headers.get("Access-Control-Allow-Origin") != "https://evil.example.com"


@rsps_lib.activate
def test_cors_multiple_allowed_origins():
    """Both MetaConfigurator frontend origins should be reflected correctly."""
    rsps_lib.add(rsps_lib.POST, f"{UPSTREAM}/chat/completions", json={"choices": []}, status=200)
    rsps_lib.add(rsps_lib.POST, f"{UPSTREAM}/chat/completions", json={"choices": []}, status=200)

    origins = ["https://www.metaconfigurator.org", "https://metaconfigurator.github.io"]
    app = create_app(make_config(allowed_origins=origins))
    with app.test_client() as client:
        for origin in origins:
            resp = _post_json(
                client,
                "/v1/chat/completions",
                {"model": "gpt-4o", "messages": []},
                headers={"Origin": origin},
            )
            assert resp.headers.get("Access-Control-Allow-Origin") == origin


# ===========================================================================
# 9. Models endpoint
# ===========================================================================


@rsps_lib.activate
def test_models_endpoint_forwarded():
    rsps_lib.add(rsps_lib.GET, f"{UPSTREAM}/models", json={"data": [{"id": "gpt-4o"}]}, status=200)

    app = create_app(make_config(enable_models_proxy=True))
    with app.test_client() as client:
        resp = client.get("/v1/models")
    assert resp.status_code == 200
    assert resp.get_json()["data"][0]["id"] == "gpt-4o"


def test_models_endpoint_disabled_returns_404():
    app = create_app(make_config(enable_models_proxy=False))
    with app.test_client() as client:
        resp = client.get("/v1/models")
    assert resp.status_code == 404


# ===========================================================================
# 10. Invalid JSON body
# ===========================================================================


def test_invalid_json_body_returns_400():
    app = create_app(make_config())
    with app.test_client() as client:
        resp = client.post(
            "/v1/chat/completions",
            data=b"this is not json",
            headers={"Content-Type": "application/json"},
        )
    assert resp.status_code == 400
    assert resp.get_json()["error"]["type"] == "relay_error"
