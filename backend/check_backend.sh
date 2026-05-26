#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${1:-$SCRIPT_DIR/.env}"
SERVICES=(
  snapshot_sharing
  mongo
  redis
  relay
  nginx-proxy
  letsencrypt
)

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "Docker Compose is not installed." >&2
  exit 1
fi

COMPOSE_ARGS=()
if [[ -f "$ENV_FILE" ]]; then
  COMPOSE_ARGS+=(--env-file "$ENV_FILE")
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
elif [[ "$ENV_FILE" != "$SCRIPT_DIR/.env" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

cd "$SCRIPT_DIR"

echo "Overall container status:"
"${COMPOSE_CMD[@]}" "${COMPOSE_ARGS[@]}" ps
echo

RUNNING_SERVICES="$("${COMPOSE_CMD[@]}" "${COMPOSE_ARGS[@]}" ps --services --status running)"
MISSING_SERVICES=()

for service in "${SERVICES[@]}"; do
  if ! grep -Fxq "$service" <<<"$RUNNING_SERVICES"; then
    MISSING_SERVICES+=("$service")
  fi
done

if ((${#MISSING_SERVICES[@]} > 0)); then
  echo "Services not running: ${MISSING_SERVICES[*]}" >&2
else
  echo "All expected services are running."
fi

echo
for service in "${SERVICES[@]}"; do
  echo "===== $service logs (last 30 lines) ====="
  "${COMPOSE_CMD[@]}" "${COMPOSE_ARGS[@]}" logs --tail=30 "$service" || true
  echo
done

if command -v curl >/dev/null 2>&1; then
  echo "===== HTTP checks ====="
  if [[ -n "${BASE_DOMAIN:-}" ]]; then
    curl -fsS "https://${BASE_DOMAIN}/health" >/dev/null && echo "OK  https://${BASE_DOMAIN}/health" || echo "FAIL https://${BASE_DOMAIN}/health"
    curl -fsS "https://${BASE_DOMAIN}/relay/health" >/dev/null && echo "OK  https://${BASE_DOMAIN}/relay/health" || echo "FAIL https://${BASE_DOMAIN}/relay/health"
    curl -fsS -o /dev/null -w "%{http_code}" "https://${BASE_DOMAIN}/snapshot/does-not-exist" | grep -qx "404" \
      && echo "OK  https://${BASE_DOMAIN}/snapshot/does-not-exist returned 404" \
      || echo "FAIL https://${BASE_DOMAIN}/snapshot/does-not-exist"
  else
    echo "Skipping domain checks because BASE_DOMAIN is not set."
  fi
else
  echo "curl not installed; skipping HTTP checks."
fi

if ((${#MISSING_SERVICES[@]} > 0)); then
  exit 1
fi
