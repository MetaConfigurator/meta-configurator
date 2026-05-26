# snapshot_sharing

Flask service that stores user snapshots and projects in MongoDB so
MetaConfigurator users can share a link to a snapshot.

| Endpoint | Method | Purpose |
|---|---|---|
| `/snapshot` | POST | Create a new snapshot |
| `/snapshot/<id>` | GET | Retrieve a snapshot |
| `/project` | POST | Publish or update a project |
| `/project/<id>` | GET | Retrieve a published project |

The full request/response shapes are documented in `app.py`.

## Run modes

### 1. Python (no Docker) — for active development

```bash
cd backend/snapshot_sharing
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# A local MongoDB and Redis are expected on the host. Adjust env vars as needed.
MONGO_HOST=localhost REDIS_HOST=localhost FLASK_ENABLE_SSL=false python app.py
```

The app listens on `http://localhost:5000`.

### 2. Docker, no HTTPS — local container test

```bash
cd backend/snapshot_sharing
docker compose up -d --build
curl http://localhost:5000/snapshot/missing-id   # → 404, service is up
```

Ports / passwords can be overridden via a `.env` file next to `docker-compose.yml`
(see `.env.example`). Defaults are fine for local use.

To stop the local stack without deleting MongoDB / Redis data:

```bash
docker compose stop
```

To remove the containers but keep the data volumes:

```bash
docker compose down
```

Do not use `docker compose down -v` unless you explicitly want to delete the
named `mongo-data` and `redis-data` volumes.

### 3. Docker + HTTPS — standalone production

For deploying *only* this service behind its own nginx + Let's Encrypt
(without the joint stack):

```bash
cp .env.example .env
# edit BASE_DOMAIN, LETSENCRYPT_EMAIL, MONGO_PASS, REDIS_PASS
docker compose -f docker-compose.https.yml up -d --build
```

### 4. Joint deployment

For deploying alongside the other backend services behind a single shared
reverse proxy, use the parent `backend/docker-compose.yml`. See
[../README.md](../README.md).

## Safe update workflow

When code has changed and you want to redeploy without losing persisted data:

```bash
cd backend/snapshot_sharing
docker compose stop
git pull
docker compose up -d --build
docker compose ps
```

For the joint production stack, run the same pattern from `backend/` instead,
using the parent compose file.

Important:

- Do not replace `stop` or `down` with `down -v` unless you intend to wipe the
  MongoDB and Redis data.
- Keep the same `MONGO_PASS` and `REDIS_PASS` values when reusing an existing
  MongoDB / Redis volume.
- If you are unsure whether the data volume still exists, check `docker volume ls`
  before restarting.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `MONGO_USER` | `root` | Mongo user |
| `MONGO_PASS` | *(required)* | Mongo password |
| `MONGO_HOST` | `mongo` | Mongo hostname |
| `MONGO_PORT` | `27017` | Mongo port |
| `MONGO_DB` | `metaconfigurator` | Mongo database name |
| `REDIS_HOST` | `redis` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASS` | *(required)* | Redis password |
| `CORS_ALLOWED_ORIGINS` | built-in defaults | Comma-separated list of frontend origins allowed to call the snapshot API from a browser |
| `FLASK_ENABLE_SSL` | `true` | Whether the Flask app terminates its own SSL. Set to `false` when behind a reverse proxy. |

## Testing

Unit tests (fast, mongomock-backed):

```bash
cd backend/snapshot_sharing
pip install -r requirements.txt -r requirements-dev.txt
pytest tests/ -v
```

End-to-end Docker test (spins up the real stack via
`docker-compose.yml`, hits the live endpoints):

```bash
bash backend/snapshot_sharing/tests/test_docker.sh
```

Both run in CI under [`.github/workflows/snapshot-sharing-tests.yml`](../../.github/workflows/snapshot-sharing-tests.yml).

## Snapshot schema (v2)

A snapshot is stored as:

```jsonc
{
  "_id": "<uuid>",
  "data_id": "<uuid>",
  "schema_id": "<uuid>",
  "settings_id": "<uuid>",
  "mode": "data" | "schema" | "settings",
  "metadata": {
    "creationDate": "...",
    "lastAccessDate": "...",
    "accessCount": 0
  }
}
```

The `mode` field is optional on POST (defaults to `"data"`) and always
returned on GET. Snapshots created before `mode` was introduced default to
`"data"` on read.
