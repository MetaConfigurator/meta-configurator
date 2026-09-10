#!/usr/bin/env bash
set -euo pipefail

docker build -t mc-relay:latest .
echo "Built mc-relay:latest"
