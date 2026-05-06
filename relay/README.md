# MetaConfigurator Relay

A small self-hosted proxy that sits between MetaConfigurator and your LLM provider.  
It holds your provider API key on the server so you never have to paste it into the browser.

Use it to:
- Keep API keys off the browser entirely.
- Share a single key across a team with rate limiting.
- Reach providers blocked by CORS in the browser (e.g. OpenRouter).

---

## Quick Start (local Python)

```bash
cd relay/

pip install -r requirements.txt

cp config.example.yaml config.yaml
# Edit config.yaml — at minimum set your api_key under endpoints

python app.py
# Relay is now listening on http://localhost:8080
```

Test it:
```bash
curl http://localhost:8080/health
# {"endpoints":5,"ok":true}
```

---

## Docker

```bash
cp config.example.yaml config.yaml
# Edit config.yaml

docker compose up -d
# Relay is now listening on http://localhost:8080
```

Or with the provided scripts:
```bash
bash build.sh
bash run.sh
```

---

## Production HTTPS

Use `docker-compose.https.yml` for automatic TLS via Let's Encrypt:

1. Edit `docker-compose.https.yml` — replace `relay.your-domain.example.com` and `your-email@example.com`.
2. Point your domain's DNS A record to the server.
3. Run:

```bash
cp config.example.yaml config.yaml
# Edit config.yaml

docker compose -f docker-compose.https.yml up -d
```

---

## Connect to MetaConfigurator

In MetaConfigurator's **AI Prompts** settings panel, set:

| Setting | Value |
|---|---|
| **Endpoint Proxy** | `http://localhost:8080` (or your relay's public HTTPS URL) |
| **API Key** | Your `relay_password` from `config.yaml` (leave empty if you didn't set one) |
| **Endpoint** | The provider URL, e.g. `https://api.openai.com/v1/` |

MetaConfigurator will route all AI requests through the relay, which injects the provider key server-side.

---

## Configuration

All options are documented in `config.example.yaml`. Copy it to `config.yaml` and fill in your provider API keys — everything else has sensible defaults.

---

## Security

- Deploy behind HTTPS — Bearer tokens over plain HTTP are interceptable.
- Set `relay_password` to a random value (`openssl rand -base64 32`) when publicly reachable.
- `chmod 600 config.yaml` to prevent other users on the host from reading your keys.
- Create provider keys with spend limits; revoke them if compromised.
- For team deployments, place the relay behind a VPN or firewall.

---

## Testing

```bash
cd relay/
pip install -r requirements.txt -r requirements-dev.txt
pytest tests/ -v
```
