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

### Rate limits

Two independent limits protect the relay, and clients can tell them apart by the
`type` field of the error response:

| Situation | Status | `type` |
| --- | --- | --- |
| The client's IP exceeded the relay's own limits (`rate_limits`) or daily token cap | 429 | `rate_limit_error` / `token_limit_error` |
| The relay's API key exceeded the provider's limit | 429 | `upstream_rate_limit_error` |

The second case is reported with the relay's own message instead of the
provider's, since the exhausted quota belongs to the relay and is shared by all
of its clients: telling that caller they exceeded a rate limit would be wrong.
It is also logged as a warning (`upstream rate limit reached endpoint=...`),
which is the signal to raise the quota at the provider or slow clients down.

### Sizing the limits

A public relay shares **one** provider quota between all of its users, so the
per-IP limits decide how much of it a single client can consume before everyone
else is locked out. This has happened in production: one user exhausted the
upstream quota and the relay became unusable for the rest of the day.

Defaults are therefore deliberately tight: 10 requests per minute, 60 per hour
and 200 per day per IP, plus 50,000 estimated tokens per IP per day.

`max_daily_tokens_per_ip` is the limit that actually protects the quota. A
request is charged its prompt size (roughly one token per 4 bytes of request
body) plus its capped `max_tokens`, because the provider bills both and
MetaConfigurator sends whole documents to the AI. Counting only `max_tokens`
would let a client send megabyte prompts all day for almost no charge. The
request counters exist to stop bursts, not to bound cost.

Raise the values only if your provider quota is large or the relay is not public.
Users who need more throughput should configure their own API key in the AI
settings instead.

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
