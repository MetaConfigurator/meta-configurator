#!/usr/bin/env bash
# Docker e2e tests for snapshot_sharing.
#
# Boots backend/snapshot_sharing/docker-compose.yml (Flask + Mongo + Redis,
# no HTTPS) and exercises the real /snapshot and /project endpoints over
# HTTP. Asserts the mode field roundtrips correctly.
#
# Usage: bash tests/test_docker.sh
set -euo pipefail

SERVICE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HEALTH_TIMEOUT_SECONDS=90
HOST_PORT=15500

# Auto-detect Docker socket (Colima uses a non-standard path).
if [ -z "${DOCKER_HOST:-}" ]; then
  COLIMA_SOCK="$HOME/.colima/default/docker.sock"
  if [ -S "$COLIMA_SOCK" ]; then
    export DOCKER_HOST="unix://$COLIMA_SOCK"
  fi
fi

# Use an isolated port to avoid clashing with anything else on 5000.
export SNAPSHOT_SHARING_PORT="$HOST_PORT"
export MONGO_PASS="test-mongo-pass"
export REDIS_PASS="test-redis-pass"

cleanup() {
  docker compose -f "$SERVICE_DIR/docker-compose.yml" down -v --remove-orphans 2>/dev/null || true
}
trap cleanup EXIT

echo "=== boot stack (Flask + Mongo + Redis) ==="
docker compose -f "$SERVICE_DIR/docker-compose.yml" up -d --build

# ------------------------------------------------------------------
echo "=== wait for service health ==="
BASE_URL="http://127.0.0.1:${HOST_PORT}"
elapsed=0
# GET /snapshot/missing returns 404 once the app is up — proves routing works
# and the Mongo dependency is reachable.
until [ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/snapshot/does-not-exist" 2>/dev/null || echo 000)" = "404" ]; do
  sleep 1
  elapsed=$((elapsed + 1))
  if [ $elapsed -ge "$HEALTH_TIMEOUT_SECONDS" ]; then
    echo "ERROR: snapshot_sharing did not become healthy within ${HEALTH_TIMEOUT_SECONDS} s" >&2
    docker compose -f "$SERVICE_DIR/docker-compose.yml" logs --tail=80 >&2
    exit 1
  fi
done

# ------------------------------------------------------------------
echo "=== POST /snapshot (default mode) -> GET roundtrip ==="
CREATE_RESP=$(curl -sf -X POST -H 'Content-Type: application/json' \
  -d '{"data": {"hello": "world"}, "schema": {"type": "object"}, "settings": {"x": 1}}' \
  "$BASE_URL/snapshot")
SNAPSHOT_ID=$(echo "$CREATE_RESP" | python3 -c "import sys, json; print(json.load(sys.stdin)['snapshot_id'])")
echo "  created snapshot_id=$SNAPSHOT_ID"

GET_RESP=$(curl -sf "$BASE_URL/snapshot/$SNAPSHOT_ID")
echo "$GET_RESP" | python3 -c "
import sys, json
body = json.load(sys.stdin)
assert body['data'] == {'hello': 'world'}, f'data mismatch: {body}'
assert body['schema'] == {'type': 'object'}, f'schema mismatch: {body}'
assert body['settings'] == {'x': 1}, f'settings mismatch: {body}'
assert body['mode'] == 'data', f'mode should default to data, got {body[\"mode\"]}'
print('  OK — default mode is data, payload intact')
"

# ------------------------------------------------------------------
echo "=== POST /snapshot (mode=schema) ==="
SNAPSHOT_ID=$(curl -sf -X POST -H 'Content-Type: application/json' \
  -d '{"data": {}, "schema": {"a": 1}, "settings": {}, "mode": "schema"}' \
  "$BASE_URL/snapshot" | python3 -c "import sys, json; print(json.load(sys.stdin)['snapshot_id'])")
MODE=$(curl -sf "$BASE_URL/snapshot/$SNAPSHOT_ID" | python3 -c "import sys, json; print(json.load(sys.stdin)['mode'])")
[ "$MODE" = "schema" ] || { echo "FAIL: expected mode=schema, got $MODE"; exit 1; }
echo "  OK — mode roundtrip works"

# ------------------------------------------------------------------
echo "=== POST /snapshot with invalid mode -> 400 ==="
STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
  -d '{"data": {}, "schema": {}, "settings": {}, "mode": "garbage"}' \
  "$BASE_URL/snapshot")
[ "$STATUS" = "400" ] || { echo "FAIL: expected 400, got $STATUS"; exit 1; }
echo "  OK — invalid mode rejected"

# ------------------------------------------------------------------
echo "=== POST /project + GET /project roundtrip ==="
SNAPSHOT_ID=$(curl -sf -X POST -H 'Content-Type: application/json' \
  -d '{"data": {"hello": "world"}, "schema": {}, "settings": {}}' \
  "$BASE_URL/snapshot" | python3 -c "import sys, json; print(json.load(sys.stdin)['snapshot_id'])")

curl -sf -X POST -H 'Content-Type: application/json' \
  -d "{\"project_id\": \"e2e-project\", \"snapshot_id\": \"$SNAPSHOT_ID\", \"edit_password\": \"supersecret\"}" \
  "$BASE_URL/project" > /dev/null

curl -sf "$BASE_URL/project/e2e-project" | python3 -c "
import sys, json
body = json.load(sys.stdin)
assert body['data'] == {'hello': 'world'}, body
assert body['mode'] == 'data', body
print('  OK — project resolves to underlying snapshot')
"

echo ""
echo "All snapshot_sharing docker e2e checks passed."
