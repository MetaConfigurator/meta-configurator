from pathlib import Path

import pytest
import app as app_module
from tests.format_cases import KNOWN_FORMAT_FIXTURES

app = app_module.app
FIXTURE_DIRECTORY = Path(__file__).parent / "fixtures"


@pytest.fixture(autouse=True)
def reset_rate_limits():
    """The limiter counts across tests, so every test starts with a fresh budget."""
    with app.app_context():
        app_module.limiter.reset()
    yield


def test_configured_cors_origins_replace_defaults(monkeypatch):
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://frontend.example")

    assert app_module._allowed_origins() == ["https://frontend.example"]


def test_configured_cors_origins_are_trimmed_and_deduplicated(monkeypatch):
    monkeypatch.setenv(
        "CORS_ALLOWED_ORIGINS",
        " https://one.example,https://two.example,https://one.example, ",
    )

    assert app_module._allowed_origins() == [
        "https://one.example",
        "https://two.example",
    ]


def test_health_endpoint():
    response = app.test_client().get("/health")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


@pytest.mark.parametrize(
    "format_fixture",
    KNOWN_FORMAT_FIXTURES,
    ids=lambda format_fixture: format_fixture.expected_format,
)
def test_detect_format_returns_each_supported_format_over_http(format_fixture):
    content = (FIXTURE_DIRECTORY / format_fixture.file_name).read_text(encoding="utf-8")
    response = app.test_client().post(
        "/detect-format-and-parse",
        json={
            "file_name": format_fixture.file_name,
            "file_type": format_fixture.mime_type,
            "content": content,
        },
    )

    assert response.status_code == 200
    result = response.get_json()
    assert result["recognized"] is True
    assert result["format"] == format_fixture.expected_format
    assert result["parsed_json"] is not None
    assert result["preprocessed_for_ai"] is not None
    assert result["message"].startswith("Backend recognized")
    assert result["parser_name"]
    assert result["ai_prompt_hint"]


def test_json_response_preserves_the_parsed_value():
    response = app.test_client().post(
        "/detect-format-and-parse",
        json={
            "file_name": "sample.json",
            "file_type": "application/json",
            "content": '{"value": 1}',
        },
    )

    result = response.get_json()
    assert result["parsed_json"] == {"value": 1}
    assert result["preprocessed_for_ai"] == {"value": 1}


def test_detect_format_requires_content():
    response = app.test_client().post(
        "/detect-format-and-parse",
        json={"file_name": "sample.json", "file_type": "application/json"},
    )

    assert response.status_code == 400
    assert response.get_json() == {"error": 'Missing required field "content"'}


def test_detect_format_reports_empty_content_without_failing():
    response = app.test_client().post(
        "/detect-format-and-parse",
        json={"file_name": "empty.txt", "file_type": "text/plain", "content": " \n\t"},
    )

    assert response.status_code == 200
    assert response.get_json() == {
        "recognized": False,
        "format": "unknown",
        "parsed_json": None,
        "preprocessed_for_ai": None,
        "message": "Input file is empty or contains only whitespace.",
        "parser_name": None,
        "ai_prompt_hint": "",
    }


def test_detect_format_rejects_malformed_json_request_body():
    response = app.test_client().post(
        "/detect-format-and-parse",
        data="{",
        content_type="application/json",
    )

    assert response.status_code == 400
    assert response.get_json() == {"error": "Missing request data"}


def test_detect_format_rejects_oversized_content():
    client = app.test_client()
    response = client.post(
        "/detect-format-and-parse",
        json={
            "file_name": "large.txt",
            "file_type": "text/plain",
            "content": "x" * (app_module.MAX_FILE_LENGTH + 1),
        },
    )

    assert response.status_code == 413
    assert response.get_json() == {"error": "Input file too large"}


def test_file_size_limit_counts_utf8_bytes(monkeypatch):
    monkeypatch.setattr(app_module, "MAX_FILE_LENGTH", 5)

    response = app.test_client().post(
        "/detect-format-and-parse",
        json={"file_name": "unicode.txt", "file_type": "text/plain", "content": "€€"},
    )

    assert response.status_code == 413
    assert response.get_json() == {"error": "Input file too large"}


def test_preprocess_options_are_applied_over_http():
    response = app.test_client().post(
        "/detect-format-and-parse",
        json={
            "file_name": "sample.json",
            "file_type": "application/json",
            "content": '{"description":"abcdefghijklmnopqrstuvwxyz"}',
            "preprocess_options": {"max_string_len": 5},
        },
    )

    assert response.status_code == 200
    assert response.get_json()["preprocessed_for_ai"]["description"] == (
        "abcde...[TRUNCATED_21_CHARS]"
    )


def test_rate_limited_requests_explain_the_limit():
    client = app.test_client()
    payload = {"file_name": "sample.csv", "file_type": "text/csv", "content": "a,b\n1,2\n"}

    responses = [client.post("/detect-format-and-parse", json=payload) for _ in range(21)]
    rate_limited = responses[-1]

    assert rate_limited.status_code == 429
    assert "try again" in rate_limited.get_json()["error"]


def test_global_request_limit_returns_json():
    client = app.test_client()
    response = client.post(
        "/detect-format-and-parse",
        data=b"x" * (app.config["MAX_CONTENT_LENGTH"] + 1),
        content_type="application/json",
    )

    assert response.status_code == 413
    assert response.get_json() == {"error": "Request body too large"}


def test_rejects_non_object_json_request():
    client = app.test_client()
    response = client.post("/detect-format-and-parse", json=["content"])

    assert response.status_code == 400
    assert response.get_json() == {"error": "Request data must be a JSON object"}


def test_cors_preflight_allows_a_configured_frontend_origin():
    response = app.test_client().options(
        "/detect-format-and-parse",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )

    assert response.status_code == 200
    assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
    assert "POST" in response.headers["Access-Control-Allow-Methods"]
    assert "Content-Type" in response.headers["Access-Control-Allow-Headers"]


def test_unexpected_errors_are_logged_and_return_a_generic_message(monkeypatch, caplog):
    def raise_unexpected_error(*_args, **_kwargs):
        raise RuntimeError("private parser detail")

    monkeypatch.setattr(app_module, "detect_format_and_parse", raise_unexpected_error)
    response = app.test_client().post(
        "/detect-format-and-parse",
        json={"file_name": "sample.txt", "file_type": "text/plain", "content": "data"},
    )

    assert response.status_code == 500
    assert response.get_json() == {"error": "Internal server error"}
    assert "private parser detail" not in response.get_data(as_text=True)
    assert "private parser detail" in caplog.text
