# MetaConfigurator Relay

A small self-hosted proxy that sits between MetaConfigurator and your LLM
provider. It holds your provider API key on the server so you never have to
paste it into the browser.

Use it to:
- Keep API keys off the browser entirely.
- Share a single key across a team with rate limiting.
- Reach providers blocked by CORS in the browser (e.g. OpenRouter).

## Run modes

### 1. Python (no Docker) — for active development

```bash
cd backend/relay
pip install -r requirements.txt
cp config.example.yaml config.yaml      # then fill in api_key(s)
python app.py
# Relay is listening on http://localhost:8080
curl http://localhost:8080/health       # → {"endpoints":..., "ok":true}
```

### 2. Docker, no HTTPS — local container test

```bash
cd backend/relay
cp config.example.yaml config.yaml
docker compose up -d --build
# Relay is listening on http://localhost:8080 (override via RELAY_PORT in .env)
```

Or use the helper scripts: `bash build.sh && bash run.sh`.

To stop the local relay container:

```bash
docker compose stop
```

To remove the containers after stopping them:

```bash
docker compose down
```

### 3. Docker + HTTPS — standalone production

For deploying *only* the relay behind its own nginx + Let's Encrypt:

```bash
cd backend/relay
cp config.example.yaml config.yaml
cp .env.example .env
# Set RELAY_HOSTNAME and LETSENCRYPT_EMAIL in .env
docker compose -f docker-compose.https.yml up -d --build
```

### 4. Joint deployment

For deploying alongside the other backend services behind a single shared
reverse proxy, use the parent `backend/docker-compose.yml` — the joint stack
mounts the relay at `https://${BASE_DOMAIN}/relay/`. See
[../README.md](../README.md).

## Safe update workflow

When relay code or configuration has changed:

```bash
cd backend/relay
docker compose stop
git pull
docker compose up -d --build
docker compose ps
```

For the joint production stack, run the update from `backend/` instead so the
shared reverse proxy and sibling services stay in sync with the parent compose
file.

If only `config.yaml` changed and the image did not, `docker compose up -d`
is usually enough; keep `--build` for code or Dockerfile changes.

## Connect to MetaConfigurator

In MetaConfigurator's **AI Prompts** settings panel, set:

| Setting | Value |
|---|---|
| **Endpoint Proxy** | `http://localhost:8080` (local), or `https://<your-host>/relay` (joint deploy), or `https://<your-host>` (standalone HTTPS deploy) |
| **API Key** | Your `relay_password` from `config.yaml` (leave empty if you didn't set one) |
| **Endpoint** | The provider URL, e.g. `https://api.openai.com/v1/` |

MetaConfigurator will route all AI requests through the relay, which injects
the provider key server-side.

There is also a pre-configured **Uni Stuttgart Relay** option in the settings
schema that points at `https://metaconfigurator.informatik.uni-stuttgart.de/relay`
with Helmholtz Blablador as the upstream.

## Configuration

All options are documented in `config.example.yaml`. Copy it to `config.yaml`
and fill in your provider API keys — everything else has sensible defaults.

## Security

- Deploy behind HTTPS — Bearer tokens over plain HTTP are interceptable.
- Set `relay_password` to a random value (`openssl rand -base64 32`) when
  publicly reachable.
- `chmod 600 config.yaml` to prevent other users on the host from reading
  your keys.
- Create provider keys with spend limits; revoke them if compromised.
- For team deployments, place the relay behind a VPN or firewall.

## Testing

```bash
cd backend/relay
pip install -r requirements.txt -r requirements-dev.txt
pytest tests/ -v
```
