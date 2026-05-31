#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.yaml"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "ERROR: config.yaml not found at $CONFIG_FILE" >&2
    echo ""
    echo "To get started:"
    echo "  cp $SCRIPT_DIR/config.example.yaml $CONFIG_FILE"
    echo "  chmod 600 $CONFIG_FILE"
    echo "  # Edit $CONFIG_FILE and set your provider API key"
    exit 1
fi

# Stop and remove any existing container with this name
if docker ps -a --format '{{.Names}}' | grep -q '^mc-relay$'; then
    echo "Stopping existing mc-relay container..."
    docker stop mc-relay >/dev/null 2>&1 || true
    docker rm mc-relay >/dev/null 2>&1 || true
fi

docker run -d \
    --name mc-relay \
    --restart unless-stopped \
    -p 8080:8080 \
    -v "$CONFIG_FILE:/app/config.yaml:ro" \
    mc-relay:latest

echo "MC Relay started in the background."
echo ""
echo "  Health check:  curl http://localhost:8080/health"
echo "  View logs:     docker logs -f mc-relay"
echo "  Stop relay:    docker stop mc-relay && docker rm mc-relay"
