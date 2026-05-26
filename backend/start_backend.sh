#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${1:-$SCRIPT_DIR/.env}"

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
elif [[ "$ENV_FILE" != "$SCRIPT_DIR/.env" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

cd "$SCRIPT_DIR"

echo "Starting full backend stack..."
"${COMPOSE_CMD[@]}" "${COMPOSE_ARGS[@]}" up -d --build

echo
echo "Current container status:"
"${COMPOSE_CMD[@]}" "${COMPOSE_ARGS[@]}" ps
