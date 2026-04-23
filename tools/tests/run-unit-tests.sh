#!/bin/bash

set -euo pipefail

# Runs unit tests for selected TypeScript services inside Docker containers.
# Usage examples:
#   ./tools/tests/run-unit-tests.sh
#   ./tools/tests/run-unit-tests.sh --service matching-sessions-service
#   ./tools/tests/run-unit-tests.sh --service user-account-service --no-build

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

SERVICES=("matching-sessions-service" "friendship-service" "user-account-service")
SELECTED_SERVICE=""
NO_BUILD=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --service)
      SELECTED_SERVICE="${2:-}"
      shift 2
      ;;
    --no-build)
      NO_BUILD=1
      shift
      ;;
    -h|--help)
      echo "Usage: ./tools/tests/run-unit-tests.sh [--service <service-name>] [--no-build]"
      echo "Services: matching-sessions-service | friendship-service | user-account-service"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -n "$SELECTED_SERVICE" ]]; then
  SERVICES=("$SELECTED_SERVICE")
fi

for svc in "${SERVICES[@]}"; do
  case "$svc" in
    matching-sessions-service|friendship-service|user-account-service) ;;
    *)
      echo "Unsupported service: $svc" >&2
      exit 1
      ;;
  esac
done

BASE_ARGS=(--env-file .env.dev -f docker-compose.dev.yaml -f ./databases/docker-compose-db.dev.yaml)

if [[ "$NO_BUILD" -eq 0 ]]; then
  echo "Building test service images..."
  docker compose "${BASE_ARGS[@]}" build "${SERVICES[@]}"
fi

for svc in "${SERVICES[@]}"; do
  echo
  echo "===================================================="
  echo "Running unit tests for: $svc"
  echo "===================================================="
  docker compose "${BASE_ARGS[@]}" run --rm "$svc" npm test
done

echo
echo "All requested unit tests passed."
