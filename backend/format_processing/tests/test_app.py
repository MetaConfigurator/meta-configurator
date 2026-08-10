from app import MAX_FILE_LENGTH, _allowed_origins, app


def test_configured_cors_origins_replace_defaults(monkeypatch):
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://frontend.example")

    assert _allowed_origins() == ["https://frontend.example"]


def test_detect_format_rejects_oversized_content():
    client = app.test_client()
    response = client.post(
        "/detect-format-and-parse",
        json={
            "file_name": "large.txt",
            "file_type": "text/plain",
            "content": "x" * (MAX_FILE_LENGTH + 1),
        },
    )

    assert response.status_code == 413
    assert response.get_json() == {"error": "Input file too large"}


def test_preprocess_rejects_oversized_data():
    client = app.test_client()
    response = client.post(
        "/preprocess-for-ai",
        json={"format": "json", "data": "x" * (MAX_FILE_LENGTH + 1)},
    )

    assert response.status_code == 413
    assert response.get_json() == {"error": "Input data too large"}


def test_global_request_limit_returns_json():
    client = app.test_client()
    response = client.post(
        "/detect-format-and-parse",
        data=b"x" * (app.config["MAX_CONTENT_LENGTH"] + 1),
        content_type="application/json",
    )

    assert response.status_code == 413
    assert response.get_json() == {"error": "Request body too large"}
