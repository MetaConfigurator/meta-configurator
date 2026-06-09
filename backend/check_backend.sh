#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_compose_helpers.sh"
SERVICES=(
  snapshot_sharing
  mongo
  redis
  relay
  nginx-proxy
  letsencrypt
)

resolve_compose_cmd
resolve_env_file "$SCRIPT_DIR" "${1:-$SCRIPT_DIR/.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
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
    DOMAIN="${BASE_DOMAIN#http://}"
    DOMAIN="${DOMAIN#https://}"
    DOMAIN="${DOMAIN%%/}"

    relay_status="$(curl -sS -o /dev/null -w "%{http_code}" "https://${DOMAIN}/relay/health" || true)"
    snapshot_status="$(curl -sS -o /dev/null -w "%{http_code}" "https://${DOMAIN}/snapshot/does-not-exist" || true)"
    root_health_status="$(curl -sS -o /dev/null -w "%{http_code}" "https://${DOMAIN}/health" || true)"

    [[ "$relay_status" == "200" ]] \
      && echo "OK  https://${DOMAIN}/relay/health" \
      || echo "FAIL https://${DOMAIN}/relay/health (status ${relay_status:-unreachable})"

    [[ "$snapshot_status" == "404" ]] \
      && echo "OK  https://${DOMAIN}/snapshot/does-not-exist returned 404" \
      || echo "FAIL https://${DOMAIN}/snapshot/does-not-exist (status ${snapshot_status:-unreachable})"

    if [[ "$root_health_status" == "200" ]]; then
      echo "OK  https://${DOMAIN}/health"
    elif [[ "$root_health_status" == "404" ]]; then
      echo "INFO https://${DOMAIN}/health returned 404 (route not configured in this deployment)"
    else
      echo "FAIL https://${DOMAIN}/health (status ${root_health_status:-unreachable})"
    fi
  else
    echo "Skipping domain checks because BASE_DOMAIN is not set."
  fi
else
  echo "curl not installed; skipping HTTP checks."
fi

if ((${#MISSING_SERVICES[@]} > 0)); then
  exit 1
fi
