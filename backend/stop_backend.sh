#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_compose_helpers.sh"

resolve_compose_cmd
resolve_env_file "$SCRIPT_DIR" "${1:-$SCRIPT_DIR/.env}"

cd "$SCRIPT_DIR"

echo "Stopping backend containers without deleting data..."
"${COMPOSE_CMD[@]}" "${COMPOSE_ARGS[@]}" stop

show_compose_status
