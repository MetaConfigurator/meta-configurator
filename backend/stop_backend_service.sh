#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_compose_helpers.sh"

resolve_compose_cmd
resolve_env_file "$SCRIPT_DIR" "${1:-$SCRIPT_DIR/.env}"
SERVICE_NAME="${2:-}"

if [[ -z "$SERVICE_NAME" ]]; then
  echo "Usage: $0 [env-file] <service-name>" >&2
  echo "Example: $0 .env snapshot_sharing" >&2
  exit 1
fi

cd "$SCRIPT_DIR"

echo "Stopping service '$SERVICE_NAME' without deleting data..."
"${COMPOSE_CMD[@]}" "${COMPOSE_ARGS[@]}" stop "$SERVICE_NAME"

show_compose_status
