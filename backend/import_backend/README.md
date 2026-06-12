# Import Backend

The import backend provides backend-side format detection, parsing, and AI
preprocessing for imported data. It is the service that powers endpoints like
`/detect-format-and-parse` and `/preprocess-for-ai`.

## Run modes

### 1. Python (no Docker)

```bash
cd backend/import_backend
pip install -r requirements.txt -r requirements-dev.txt
python app.py
# Import backend is listening on http://localhost:5000
curl http://localhost:5000/health
```

### 2. Docker, no HTTPS

```bash
cd backend/import_backend
docker compose up -d --build
# Import backend is listening on http://localhost:5000
```

### 3. Docker + HTTPS

```bash
cd backend/import_backend
cp .env.example .env
# Set IMPORT_BACKEND_HOSTNAME and LETSENCRYPT_EMAIL in .env
docker compose -f docker-compose.https.yml up -d --build
```

### 4. Joint deployment

For deployment alongside the other MetaConfigurator backend services, use the
parent [../docker-compose.yml](../docker-compose.yml). In the joint setup the
service is mounted at:

`https://${BASE_DOMAIN}/import-backend/`

The reverse proxy strips the `/import-backend/` prefix before forwarding, so
the Flask app still sees routes like `/detect-format-and-parse`.

## Endpoints

- `GET /health`
- `POST /detect-format-and-parse`
- `POST /preprocess-for-ai`

## Testing

```bash
cd backend/import_backend
pip install -r requirements.txt -r requirements-dev.txt
pytest tests/ -v
```
