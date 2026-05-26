# MetaConfigurator Backend

A small collection of independent backend services that MetaConfigurator may
connect to. They live side-by-side under this directory and can be deployed
individually or jointly behind a single reverse proxy.

## Architecture

In the joint deployment a single **nginx reverse proxy**
(`nginxproxy/nginx-proxy` + `nginxproxy/acme-companion`) is the only thing
exposed publicly. It terminates TLS, fetches/renews Let's Encrypt certificates
automatically, and routes incoming requests by **URL path** to the appropriate
service container:

```
                        ┌──────────────────────┐
   https://BASE_DOMAIN  │   nginx-proxy + LE   │  (only public-facing service)
   ─────────────────►   │   ports 80 / 443     │
                        └──────────┬───────────┘
                                   │ internal backend-network
                ┌──────────────────┼────────────────────────┐
                │                  │                        │
       /, /snapshot/*,       /relay/* (path        /<future>/* (path
       /project/*            stripped)             stripped)
                │                  │                        │
        ┌───────▼────────┐  ┌──────▼──────┐         ┌───────▼───────┐
        │ snapshot_     │  │    relay    │   ...   │  heavy_svc    │
        │ sharing       │  │             │         │  (future)     │
        └───────┬────────┘  └─────────────┘         └───────────────┘
                │
        ┌───────┴──────┐
        │ mongo  redis │
        └──────────────┘
```

Each service runs in its own container with no public ports. They cannot reach
each other unless explicitly placed on the same network. Crashes in one
service do not affect the others: nginx returns `502` for that path and the
rest of the stack stays up. This isolation is the main reason for the
split-service architecture.

## Running services

Every service supports three deployment modes:

| Mode | Command | When |
|---|---|---|
| Python (no Docker) | `python app.py` | Active development, fastest iteration |
| Docker (no HTTPS) | `docker compose up -d --build` | Local container test |
| Docker + HTTPS | `docker compose -f docker-compose.https.yml up -d --build` | Standalone production for a single service |

For the **whole stack with HTTPS**, run from this directory:

```bash
cp .env.example .env             # then edit values
docker compose up -d --build     # uses ./docker-compose.yml
```

See each service's `README.md` for service-specific setup (config files,
secrets, …).

## Stopping services safely

To stop the joint stack without deleting persistent data:

```bash
cd backend
docker compose stop
```

Or use the helper script:

```bash
cd backend
bash stop_backend.sh
```

If you want to remove the containers but keep the data volumes:

```bash
cd backend
docker compose down
```

Do not use `docker compose down -v` unless you explicitly want to delete the
MongoDB and Redis volumes as well. In this stack, snapshot-sharing persists
its database in the named volume `mongo-data`, so `down -v` removes the stored
database contents.

## Updating code safely

When backend code or compose files have changed, use this rollout pattern on
the server:

```bash
cd backend
docker compose stop
git pull
docker compose up -d --build
docker compose ps
```

Equivalent helper script for the startup step:

```bash
cd backend
bash start_backend.sh
```

Notes:

- Keep using the same compose project name as before, otherwise Docker may
  create fresh volumes with different names and the services will appear to
  start with empty state.
- Keep `MONGO_PASS` and `REDIS_PASS` unchanged unless you are intentionally
  migrating credentials and know how the existing data stores were initialized.
- Before a production update, consider verifying that the expected volumes
  still exist with `docker volume ls`.

## Helper scripts

The joint stack ships with three small operational scripts in `backend/`:

- `bash stop_backend.sh [path-to-env-file]` stops all containers gracefully and
  then prints `docker compose ps`.
- `bash start_backend.sh [path-to-env-file]` starts the full stack with
  `up -d --build` and then prints `docker compose ps`.
- `bash check_backend.sh [path-to-env-file]` prints overall container status,
  checks that each expected service is running, shows recent logs per service,
  and performs simple HTTP checks when `curl` and `BASE_DOMAIN` are available.

If no env file is passed, the scripts default to `backend/.env`.

## Adding a new backend service

The structure is intentionally repetitive so new services follow the same
template. To add a service called `myservice`:

1. **Create the service directory.**

   ```
   backend/myservice/
   ├── app.py                       # Flask app
   ├── Dockerfile
   ├── requirements.txt
   ├── README.md
   ├── docker-compose.yml           # local docker, no HTTPS
   └── docker-compose.https.yml     # standalone HTTPS
   ```

   Use `backend/relay/` as the simplest reference; `backend/snapshot_sharing/`
   is the reference if your service has its own data store.

2. **Pick an internal port** (e.g. `9000`); this is the port your Flask app
   listens on inside the container.

3. **Add a block to `backend/docker-compose.yml`:**

   ```yaml
     myservice:
       container_name: myservice
       build: ./myservice
       expose:
         - "9000"
       restart: unless-stopped
       networks:
         - backend-network
       environment:
         VIRTUAL_HOST: ${BASE_DOMAIN}
         VIRTUAL_PATH: /myservice/
         VIRTUAL_DEST: /                 # strip /myservice/ before forwarding
         VIRTUAL_PORT: 9000
         # no LETSENCRYPT_* — the cert is anchored on snapshot_sharing
   ```

4. **Reachable at** `https://${BASE_DOMAIN}/myservice/...` once the stack is
   restarted. Your Flask app sees its routes (`/foo`, `/bar`) unchanged
   because `VIRTUAL_DEST=/` strips the path prefix.

5. **Optional: local docker port.** Add a `MYSERVICE_PORT=9000` entry to the
   service's `.env.example` and reference it in `backend/myservice/docker-compose.yml`
   as `"${MYSERVICE_PORT:-9000}:9000"` so developers can change it without
   editing the compose file.

### Why path-based routing (and not subdomains)?

- No DNS work: one A-record at `BASE_DOMAIN` covers every service forever.
- One Let's Encrypt certificate covers every service.
- New services drop in without touching the proxy, the firewall, or DNS.

### Why does only `snapshot_sharing` carry `LETSENCRYPT_HOST`?

`acme-companion` issues one certificate per `LETSENCRYPT_HOST` value it sees
on a container that also has `VIRTUAL_HOST`. Because every service shares the
same hostname, one anchor container is enough. `snapshot_sharing` is the
natural anchor: it's the always-on root service. New services do **not** need
to declare `LETSENCRYPT_*`.

## Environment variables

The joint compose reads `.env` from this directory. See `.env.example` for the
full list. The most important ones:

| Variable | Purpose |
|---|---|
| `BASE_DOMAIN` | Public hostname that the proxy serves |
| `LETSENCRYPT_EMAIL` | Contact for Let's Encrypt |
| `MONGO_PASS`, `REDIS_PASS` | Snapshot-sharing storage secrets |
