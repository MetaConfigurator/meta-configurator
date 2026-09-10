#!/usr/bin/env bash
# Production-container smoke tests for the format processing service.
#
# Covers the Dockerfile, local Compose deployment, standalone HTTPS service
# definition, joint backend Compose definition, and Redis-backed rate limiting.
# The reverse proxies themselves are not started because CI has no public DNS
# name or certificate; both proxy-facing Compose files are fully rendered and
# their application containers are started with the same environment contract.
set -euo pipefail

SERVICE_DIRECTORY="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIRECTORY="$(cd "$SERVICE_DIRECTORY/.." && pwd)"
SMOKE_OVERRIDE="$SERVICE_DIRECTORY/tests/docker-compose.smoke.override.yml"
IMAGE_NAME="mc-format-processing-smoke-$$"
DOCKERFILE_CONTAINER="mc-format-processing-dockerfile-$$"
REDIS_CONTAINER="mc-format-processing-redis-$$"
REDIS_APP_CONTAINER="mc-format-processing-redis-app-$$"
REDIS_NETWORK="mc-format-processing-network-$$"
LOCAL_COMPOSE_PROJECT="mc-format-processing-local-$$"
HTTPS_COMPOSE_PROJECT="mc-format-processing-https-$$"
HOST_PORT="${FORMAT_PROCESSING_SMOKE_PORT:-18091}"
HEALTH_TIMEOUT_SECONDS=90

export FORMAT_PROCESSING_HOSTNAME="${FORMAT_PROCESSING_HOSTNAME:-format-processing.test.example.com}"
export LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-test@example.com}"
export FORMAT_PROCESSING_PORT="$HOST_PORT"

# Colima uses a non-standard Docker socket on macOS.
if [ -z "${DOCKER_HOST:-}" ]; then
  COLIMA_SOCKET="$HOME/.colima/default/docker.sock"
  if [ -S "$COLIMA_SOCKET" ]; then
    export DOCKER_HOST="unix://$COLIMA_SOCKET"
  fi
fi

cleanup() {
  docker rm -f \
    "$DOCKERFILE_CONTAINER" \
    "$REDIS_APP_CONTAINER" \
    "$REDIS_CONTAINER" \
    2>/dev/null || true
  docker network rm "$REDIS_NETWORK" 2>/dev/null || true

  FORMAT_PROCESSING_SMOKE_CONTAINER_NAME="mc-format-processing-local-$$" \
    docker compose \
      --project-name "$LOCAL_COMPOSE_PROJECT" \
      -f "$SERVICE_DIRECTORY/docker-compose.yml" \
      -f "$SMOKE_OVERRIDE" \
      down -v --remove-orphans 2>/dev/null || true

  FORMAT_PROCESSING_SMOKE_CONTAINER_NAME="mc-format-processing-https-$$" \
    docker compose \
      --project-name "$HTTPS_COMPOSE_PROJECT" \
      -f "$SERVICE_DIRECTORY/docker-compose.https.yml" \
      -f "$SMOKE_OVERRIDE" \
      down -v --remove-orphans 2>/dev/null || true

  docker rmi -f "$IMAGE_NAME" 2>/dev/null || true
}
trap cleanup EXIT

wait_until_healthy() {
  local health_url=$1
  local container_name=$2
  local elapsed_seconds=0

  until curl -sf "$health_url" >/dev/null 2>&1; do
    sleep 1
    elapsed_seconds=$((elapsed_seconds + 1))
    if [ "$elapsed_seconds" -ge "$HEALTH_TIMEOUT_SECONDS" ]; then
      echo "ERROR: $health_url did not become healthy within ${HEALTH_TIMEOUT_SECONDS}s" >&2
      docker logs "$container_name" >&2 || true
      return 1
    fi
  done
}

assert_http_contract() {
  local base_url=$1

  python3 - "$base_url" <<'PY'
import json
import sys
import urllib.error
import urllib.request

base_url = sys.argv[1]


def request_json(path, payload=None):
    request_data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        base_url + path,
        data=request_data,
        headers={"Content-Type": "application/json"} if payload is not None else {},
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return response.status, json.load(response)


status, health = request_json("/health")
assert status == 200 and health == {"status": "ok"}, health

status, json_result = request_json(
    "/detect-format-and-parse",
    {
        "file_name": "sample.json",
        "file_type": "application/json",
        "content": '{"value": 1}',
    },
)
assert status == 200, status
assert json_result["format"] == "json", json_result
assert json_result["parsed_json"] == {"value": 1}, json_result

turtle = """@prefix ex: <http://example.org/> .
ex:item a ex:Record ; ex:name "Ada" .
"""
status, turtle_result = request_json(
    "/detect-format-and-parse",
    {"file_name": "sample.ttl", "file_type": "text/turtle", "content": turtle},
)
assert status == 200, status
assert turtle_result["format"] == "ttl", turtle_result
assert turtle_result["parsed_json"]["@context"]["ex"] == "http://example.org/", turtle_result
assert isinstance(turtle_result["parsed_json"]["@graph"], list), turtle_result

try:
    request_json("/detect-format-and-parse", {"file_name": "missing-content.json"})
except urllib.error.HTTPError as error:
    error_body = json.load(error)
    assert error.code == 400, error.code
    assert error_body == {"error": 'Missing required field "content"'}, error_body
else:
    raise AssertionError("Missing content unexpectedly succeeded")

print("HTTP contract checks passed")
PY
}

echo "=== Dockerfile and Gunicorn smoke test ==="
docker build -t "$IMAGE_NAME" "$SERVICE_DIRECTORY"
docker run -d \
  --name "$DOCKERFILE_CONTAINER" \
  -p "$HOST_PORT:5000" \
  -e RATELIMIT_ENABLED=false \
  "$IMAGE_NAME" >/dev/null
wait_until_healthy "http://127.0.0.1:$HOST_PORT/health" "$DOCKERFILE_CONTAINER"
assert_http_contract "http://127.0.0.1:$HOST_PORT"

container_user_id="$(docker exec "$DOCKERFILE_CONTAINER" id -u)"
if [ "$container_user_id" = "0" ]; then
  echo "ERROR: format processing container runs as root" >&2
  exit 1
fi
docker rm -f "$DOCKERFILE_CONTAINER" >/dev/null

echo "=== Redis-backed rate-limit smoke test ==="
docker network create "$REDIS_NETWORK" >/dev/null
docker run -d \
  --name "$REDIS_CONTAINER" \
  --network "$REDIS_NETWORK" \
  redis:7.4-alpine \
  redis-server --requirepass test-password >/dev/null

until docker exec "$REDIS_CONTAINER" redis-cli -a test-password ping 2>/dev/null | grep -q PONG; do
  sleep 1
done

docker run -d \
  --name "$REDIS_APP_CONTAINER" \
  --network "$REDIS_NETWORK" \
  -p "$HOST_PORT:5000" \
  -e "RATELIMIT_STORAGE_URI=redis://:test-password@$REDIS_CONTAINER:6379/1" \
  "$IMAGE_NAME" >/dev/null
wait_until_healthy "http://127.0.0.1:$HOST_PORT/health" "$REDIS_APP_CONTAINER"

python3 - "http://127.0.0.1:$HOST_PORT" <<'PY'
import json
import sys
import urllib.error
import urllib.request

url = sys.argv[1] + "/detect-format-and-parse"
body = json.dumps(
    {"file_name": "sample.json", "file_type": "application/json", "content": "{}"}
).encode("utf-8")
statuses = []
last_error = None

for _ in range(21):
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            statuses.append(response.status)
    except urllib.error.HTTPError as error:
        statuses.append(error.code)
        last_error = json.load(error)

assert statuses[:20] == [200] * 20, statuses
assert statuses[20] == 429, statuses
assert last_error and "Please wait a moment and try again" in last_error["error"], last_error
print("Redis-backed rate limiting passed")
PY

docker rm -f "$REDIS_APP_CONTAINER" "$REDIS_CONTAINER" >/dev/null
docker network rm "$REDIS_NETWORK" >/dev/null

echo "=== Local Compose smoke test ==="
export FORMAT_PROCESSING_SMOKE_CONTAINER_NAME="mc-format-processing-local-$$"
docker compose \
  --project-name "$LOCAL_COMPOSE_PROJECT" \
  -f "$SERVICE_DIRECTORY/docker-compose.yml" \
  -f "$SMOKE_OVERRIDE" \
  up -d --build
wait_until_healthy \
  "http://127.0.0.1:$HOST_PORT/health" \
  "$FORMAT_PROCESSING_SMOKE_CONTAINER_NAME"
assert_http_contract "http://127.0.0.1:$HOST_PORT"
docker compose \
  --project-name "$LOCAL_COMPOSE_PROJECT" \
  -f "$SERVICE_DIRECTORY/docker-compose.yml" \
  -f "$SMOKE_OVERRIDE" \
  down -v --remove-orphans

echo "=== Standalone HTTPS Compose service smoke test ==="
export FORMAT_PROCESSING_SMOKE_CONTAINER_NAME="mc-format-processing-https-$$"
docker compose \
  --project-name "$HTTPS_COMPOSE_PROJECT" \
  -f "$SERVICE_DIRECTORY/docker-compose.https.yml" \
  -f "$SMOKE_OVERRIDE" \
  config --quiet
docker compose \
  --project-name "$HTTPS_COMPOSE_PROJECT" \
  -f "$SERVICE_DIRECTORY/docker-compose.https.yml" \
  -f "$SMOKE_OVERRIDE" \
  up -d --build format_processing

elapsed_seconds=0
until docker compose \
    --project-name "$HTTPS_COMPOSE_PROJECT" \
    -f "$SERVICE_DIRECTORY/docker-compose.https.yml" \
    -f "$SMOKE_OVERRIDE" \
    exec -T format_processing \
    python -c "import json, urllib.request; assert json.load(urllib.request.urlopen('http://127.0.0.1:5000/health')) == {'status': 'ok'}" \
    >/dev/null 2>&1; do
  sleep 1
  elapsed_seconds=$((elapsed_seconds + 1))
  if [ "$elapsed_seconds" -ge "$HEALTH_TIMEOUT_SECONDS" ]; then
    echo "ERROR: HTTPS Compose application service did not become healthy" >&2
    docker logs "$FORMAT_PROCESSING_SMOKE_CONTAINER_NAME" >&2 || true
    exit 1
  fi
done
docker compose \
  --project-name "$HTTPS_COMPOSE_PROJECT" \
  -f "$SERVICE_DIRECTORY/docker-compose.https.yml" \
  -f "$SMOKE_OVERRIDE" \
  down -v --remove-orphans

echo "=== Joint backend Compose configuration check ==="
docker compose \
  --env-file "$BACKEND_DIRECTORY/.env.example" \
  -f "$BACKEND_DIRECTORY/docker-compose.yml" \
  config --quiet

echo "All format processing Docker smoke tests passed."
