"""Unit tests for snapshot_sharing — POST/GET /snapshot and /project."""

SAMPLE_PAYLOAD = {
    "data": {"hello": "world"},
    "schema": {"type": "object"},
    "settings": {"frontend": {"theme": "light"}},
}


# ---------------------------------------------------------------------------
# /snapshot
# ---------------------------------------------------------------------------


def test_post_snapshot_creates_with_default_mode(client):
    resp = client.post("/snapshot", json=SAMPLE_PAYLOAD)
    assert resp.status_code == 201
    snapshot_id = resp.get_json()["snapshot_id"]
    assert isinstance(snapshot_id, str) and len(snapshot_id) > 0

    got = client.get(f"/snapshot/{snapshot_id}").get_json()
    assert got["data"] == SAMPLE_PAYLOAD["data"]
    assert got["schema"] == SAMPLE_PAYLOAD["schema"]
    assert got["settings"] == SAMPLE_PAYLOAD["settings"]
    assert got["mode"] == "data"  # default when not provided


def test_post_snapshot_with_explicit_mode_roundtrips(client):
    for mode in ("data", "schema", "settings"):
        resp = client.post("/snapshot", json={**SAMPLE_PAYLOAD, "mode": mode})
        assert resp.status_code == 201
        snapshot_id = resp.get_json()["snapshot_id"]
        got = client.get(f"/snapshot/{snapshot_id}").get_json()
        assert got["mode"] == mode


def test_post_snapshot_rejects_invalid_mode(client):
    resp = client.post("/snapshot", json={**SAMPLE_PAYLOAD, "mode": "garbage"})
    assert resp.status_code == 400
    assert "Invalid mode" in resp.get_json()["error"]


def test_post_snapshot_missing_fields(client):
    resp = client.post("/snapshot", json={"data": {}, "schema": {}})  # no settings
    assert resp.status_code == 400


def test_post_snapshot_empty_body(client):
    resp = client.post("/snapshot", json={})
    assert resp.status_code == 400


def test_get_snapshot_not_found(client):
    resp = client.get("/snapshot/does-not-exist")
    assert resp.status_code == 404


def test_get_snapshot_legacy_without_mode_defaults_to_data(client, app_module):
    """Snapshots stored before the `mode` field was introduced should read as 'data'."""
    # Insert a snapshot directly into the mocked Mongo, omitting `mode`.
    db = app_module.db
    files = db["files"]
    files.insert_one({"_id": "legacy-data-id", "file": {"x": 1}})
    files.insert_one({"_id": "legacy-schema-id", "file": {"x": 2}})
    files.insert_one({"_id": "legacy-settings-id", "file": {"x": 3}})
    db["snapshots"].insert_one(
        {
            "_id": "legacy-snap",
            "data_id": "legacy-data-id",
            "schema_id": "legacy-schema-id",
            "settings_id": "legacy-settings-id",
            "metadata": {
                "creationDate": "2024-01-01T00:00:00",
                "lastAccessDate": "2024-01-01T00:00:00",
                "accessCount": 0,
            },
            # NB: no `mode` field on purpose
        }
    )

    got = client.get("/snapshot/legacy-snap").get_json()
    assert got["mode"] == "data"


def test_post_snapshot_duplicate_id_conflict(client):
    payload = {**SAMPLE_PAYLOAD, "snapshot_id": "fixed-id"}
    assert client.post("/snapshot", json=payload).status_code == 201
    second = client.post("/snapshot", json=payload)
    assert second.status_code == 409


# ---------------------------------------------------------------------------
# /project
# ---------------------------------------------------------------------------


def _create_snapshot(client):
    return client.post("/snapshot", json=SAMPLE_PAYLOAD).get_json()["snapshot_id"]


def test_publish_project_then_get(client):
    snapshot_id = _create_snapshot(client)
    resp = client.post(
        "/project",
        json={
            "project_id": "my-project",
            "snapshot_id": snapshot_id,
            "edit_password": "supersecret",
        },
    )
    assert resp.status_code == 201

    got = client.get("/project/my-project")
    assert got.status_code == 200
    body = got.get_json()
    assert body["data"] == SAMPLE_PAYLOAD["data"]
    assert body["mode"] == "data"


def test_publish_project_short_id_rejected(client):
    snapshot_id = _create_snapshot(client)
    resp = client.post(
        "/project",
        json={
            "project_id": "ab",
            "snapshot_id": snapshot_id,
            "edit_password": "supersecret",
        },
    )
    assert resp.status_code == 400


def test_publish_project_short_password_rejected(client):
    snapshot_id = _create_snapshot(client)
    resp = client.post(
        "/project",
        json={
            "project_id": "my-project",
            "snapshot_id": snapshot_id,
            "edit_password": "short",
        },
    )
    assert resp.status_code == 400


def test_publish_project_unknown_snapshot(client):
    resp = client.post(
        "/project",
        json={
            "project_id": "my-project",
            "snapshot_id": "no-such-snapshot",
            "edit_password": "supersecret",
        },
    )
    assert resp.status_code == 404


def test_republish_with_wrong_password_forbidden(client):
    snapshot_id = _create_snapshot(client)
    first = client.post(
        "/project",
        json={
            "project_id": "my-project",
            "snapshot_id": snapshot_id,
            "edit_password": "correctpw",
        },
    )
    assert first.status_code == 201

    second = client.post(
        "/project",
        json={
            "project_id": "my-project",
            "snapshot_id": snapshot_id,
            "edit_password": "wrongpassword",
        },
    )
    assert second.status_code == 403


def test_republish_with_correct_password_updates(client):
    first_snap = _create_snapshot(client)
    client.post(
        "/project",
        json={
            "project_id": "my-project",
            "snapshot_id": first_snap,
            "edit_password": "correctpw",
        },
    )

    second_snap = client.post(
        "/snapshot",
        json={**SAMPLE_PAYLOAD, "data": {"hello": "updated"}},
    ).get_json()["snapshot_id"]

    update = client.post(
        "/project",
        json={
            "project_id": "my-project",
            "snapshot_id": second_snap,
            "edit_password": "correctpw",
        },
    )
    assert update.status_code == 200

    got = client.get("/project/my-project").get_json()
    assert got["data"] == {"hello": "updated"}


def test_get_project_not_found(client):
    resp = client.get("/project/missing")
    assert resp.status_code == 404
