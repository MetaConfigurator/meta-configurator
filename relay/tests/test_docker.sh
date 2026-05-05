#!/usr/bin/env bash
# Docker smoke tests for the MetaConfigurator Relay.
# Tests three deployment methods: Dockerfile, docker-compose.yml, docker-compose.https.yml.
#
# Never modifies config.yaml — injects a test config via a compose override file.
#
# Usage: bash tests/test_docker.sh
set -euo pipefail

RELAY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="mc-relay-smoke-$$"
HEALTH_TIMEOUT_SECONDS=60

# Auto-detect Docker socket (Colima uses a non-standard path).
if [ -z "${DOCKER_HOST:-}" ]; then
  COLIMA_SOCK="$HOME/.colima/default/docker.sock"
  if [ -S "$COLIMA_SOCK" ]; then
    export DOCKER_HOST="unix://$COLIMA_SOCK"
  fi
fi

# Minimal test config — open relay with a single dummy endpoint.
# macOS $TMPDIR (/var/folders) and /tmp are not in Colima's shared mounts.
# Place temp files inside the relay directory (/Users/...) which is always shared.
TEMP_CONFIG=$(mktemp "$RELAY_DIR/.tmp-test-config.XXXXXX")
cat > "$TEMP_CONFIG" << 'EOF'
relay_password: ""
allowed_origins: []
rate_limits:
  enabled: false
  requests_per_minute: 1000
  requests_per_hour: 100000
  requests_per_day: 1000000
limits:
  max_request_tokens: 10000
  max_daily_tokens_per_ip: 0
  max_request_bytes: 2097152
request_timeout: 30
enable_streaming: false
enable_models_proxy: false
log_level: INFO
endpoints:
  - name: dummy
    url: http://localhost:9999
    api_key: "test"
EOF

# Compose override — replaces the config.yaml volume with our temp config.
# This avoids touching the real config.yaml entirely.
TEMP_OVERRIDE=$(mktemp "$RELAY_DIR/.tmp-test-override.XXXXXX").yml
cat > "$TEMP_OVERRIDE" << EOF
services:
  relay:
    volumes:
      - ${TEMP_CONFIG}:/app/config.yaml:ro
EOF

cleanup() {
  docker rm -f "mc-relay-df-$$" 2>/dev/null || true
  docker rmi -f "$IMAGE" 2>/dev/null || true
  docker compose -f "$RELAY_DIR/docker-compose.yml" -f "$TEMP_OVERRIDE" down -v 2>/dev/null || true
  docker compose -f "$RELAY_DIR/docker-compose.https.yml" -f "$TEMP_OVERRIDE" down -v 2>/dev/null || true
  rm -f "$TEMP_CONFIG" "$TEMP_OVERRIDE"
}
trap cleanup EXIT

# Poll a URL until HTTP 200 or 30 s timeout.
wait_healthy() {
  local url=$1
  local elapsed=0
  until curl -sf "$url" > /dev/null 2>&1; do
    sleep 1
    elapsed=$((elapsed + 1))
    if [ $elapsed -ge "$HEALTH_TIMEOUT_SECONDS" ]; then
      echo "ERROR: $url did not become healthy within ${HEALTH_TIMEOUT_SECONDS} s" >&2
      return 1
    fi
  done
}

PASS=0
FAIL=0

run_test() {
  local name=$1
  shift
  echo ""
  echo "=== $name ==="
  if "$@"; then
    echo "PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $name"
    FAIL=$((FAIL + 1))
  fi
}

# ----------------------------------------------------------------
test_dockerfile() {
  docker build -t "$IMAGE" "$RELAY_DIR" || return 1
  docker run -d \
    --name "mc-relay-df-$$" \
    -p 18090:8080 \
    -v "$TEMP_CONFIG:/app/config.yaml:ro" \
    "$IMAGE" || return 1
  wait_healthy "http://127.0.0.1:18090/health" || return 1
  curl -sf "http://127.0.0.1:18090/health" | grep -q '"ok":true' || return 1
  docker rm -f "mc-relay-df-$$" || true
  docker rmi -f "$IMAGE" || true
}

# ----------------------------------------------------------------
test_compose_http() {
  docker compose -f "$RELAY_DIR/docker-compose.yml" -f "$TEMP_OVERRIDE" up -d --build
  wait_healthy "http://127.0.0.1:8080/health" || return 1
  curl -sf "http://127.0.0.1:8080/health" | grep -q '"ok":true' || return 1
  docker compose -f "$RELAY_DIR/docker-compose.yml" -f "$TEMP_OVERRIDE" down -v
}

# ----------------------------------------------------------------
# For the HTTPS compose we only start the relay service — nginx-proxy and
# letsencrypt require a real domain and cannot be tested in CI.
# Health is checked via Python inside the container (image has no curl).
test_compose_https() {
  docker compose -f "$RELAY_DIR/docker-compose.https.yml" -f "$TEMP_OVERRIDE" config --quiet

  docker compose -f "$RELAY_DIR/docker-compose.https.yml" -f "$TEMP_OVERRIDE" up -d --build relay

  local elapsed=0
  until docker compose -f "$RELAY_DIR/docker-compose.https.yml" -f "$TEMP_OVERRIDE" exec -T relay \
      python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health')" \
      > /dev/null 2>&1; do
    sleep 1
    elapsed=$((elapsed + 1))
    if [ $elapsed -ge "$HEALTH_TIMEOUT_SECONDS" ]; then
      echo "ERROR: relay service in HTTPS compose did not become healthy within ${HEALTH_TIMEOUT_SECONDS} s" >&2
      return 1
    fi
  done

  RESPONSE=$(docker compose -f "$RELAY_DIR/docker-compose.https.yml" -f "$TEMP_OVERRIDE" exec -T relay \
    python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8080/health').read().decode())")
  echo "$RESPONSE" | grep -q '"ok":true'
  docker compose -f "$RELAY_DIR/docker-compose.https.yml" -f "$TEMP_OVERRIDE" down -v
}

# ----------------------------------------------------------------
run_test "Dockerfile"               test_dockerfile
run_test "docker-compose.yml"       test_compose_http
run_test "docker-compose.https.yml" test_compose_https

echo ""
echo "Results: $PASS passed, $FAIL failed."
[ $FAIL -eq 0 ]
