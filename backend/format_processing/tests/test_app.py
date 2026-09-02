import app as app_module

app = app_module.app


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


def test_detect_format_returns_the_serialized_detection_result():
    response = app.test_client().post(
        "/detect-format-and-parse",
        json={
            "file_name": "sample.json",
            "file_type": "application/json",
            "content": '{"value": 1}',
        },
    )

    assert response.status_code == 200
    result = response.get_json()
    assert result["recognized"] is True
    assert result["format"] == "json"
    assert result["parsed_json"] == {"value": 1}
    assert result["preprocessed_for_ai"] == {"value": 1}


def test_detect_format_requires_content():
    response = app.test_client().post(
        "/detect-format-and-parse",
        json={"file_name": "sample.json", "file_type": "application/json"},
    )

    assert response.status_code == 400
    assert response.get_json() == {"error": 'Missing required field "content"'}


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
