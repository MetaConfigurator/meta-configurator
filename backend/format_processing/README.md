# Format Processing Service

The format processing service provides backend-side format detection, parsing, and AI
preprocessing for imported data. It is the service behind the `/detect-format-and-parse`
endpoint used by the AI-assisted data import.

## Run modes

### 1. Python (no Docker)

```bash
cd backend/format_processing
pip install -r requirements.txt -r requirements-dev.txt
python app.py
# Format processing service is listening on http://localhost:5000
curl http://localhost:5000/health
```

### 2. Docker, no HTTPS

```bash
cd backend/format_processing
docker compose up -d --build
# Format processing service is listening on http://localhost:5000
```

### 3. Docker + HTTPS

```bash
cd backend/format_processing
cp .env.example .env
# Set FORMAT_PROCESSING_HOSTNAME and LETSENCRYPT_EMAIL in .env
docker compose -f docker-compose.https.yml up -d --build
```

### 4. Joint deployment

For deployment alongside the other MetaConfigurator backend services, use the
parent [../docker-compose.yml](../docker-compose.yml). In the joint setup the
service is mounted at:

`https://${BASE_DOMAIN}/format-processing/`

The reverse proxy strips the `/format-processing/` prefix before forwarding, so
the Flask app still sees routes like `/detect-format-and-parse`.

## Endpoints

- `GET /health`
- `POST /detect-format-and-parse`

## Configuration

- `CORS_ALLOWED_ORIGINS`: comma-separated browser origins. If unset, the known
  MetaConfigurator production and local-development origins are used.
- `MAX_FILE_LENGTH`: maximum UTF-8 size of the imported content
  (default: `500000` bytes).
- `MAX_REQUEST_LENGTH`: maximum HTTP request size, including JSON overhead
  (default: `1000000` bytes).
- `RATELIMIT_STORAGE_URI`: Flask-Limiter storage URI. The joint backend uses its
  Redis service; standalone development defaults to in-memory counters.

## Testing

```bash
cd backend/format_processing
pip install -r requirements.txt -r requirements-dev.txt
pytest tests/ -v
```
