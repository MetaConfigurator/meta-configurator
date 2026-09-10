#!/usr/bin/env bash

resolve_compose_cmd() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
  else
    echo "Docker Compose is not installed." >&2
    exit 1
  fi
}

resolve_env_file() {
  local script_dir="$1"
  local env_file="${2:-$script_dir/.env}"

  COMPOSE_ARGS=()
  if [[ -f "$env_file" ]]; then
    COMPOSE_ARGS+=(--env-file "$env_file")
  elif [[ "$env_file" != "$script_dir/.env" ]]; then
    echo "Env file not found: $env_file" >&2
    exit 1
  fi

  ENV_FILE="$env_file"
}

show_compose_status() {
  echo
  echo "Current container status:"
  "${COMPOSE_CMD[@]}" "${COMPOSE_ARGS[@]}" ps
}
