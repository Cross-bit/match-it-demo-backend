#!/bin/bash

set -euo pipefail

# Runs unit tests for selected TypeScript services.
# Usage examples:
#   ./tools/tests/run-unit-tests.sh
#   ./tools/tests/run-unit-tests.sh --service matching-sessions-service
#   ./tools/tests/run-unit-tests.sh --mode docker --service user-account-service --no-build

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

SERVICES=("matching-sessions-service" "friendship-service" "user-account-service")
SELECTED_SERVICE=""
MODE="local"
NO_BUILD=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --docker)
      MODE="docker"
      shift
      ;;
    --service)
      SELECTED_SERVICE="${2:-}"
      shift 2
      ;;
    --no-build)
      NO_BUILD=1
      shift
      ;;
    -h|--help)
      echo "Usage: ./tools/tests/run-unit-tests.sh [--mode local|docker] [--docker] [--service <service-name>] [--no-build]"
      echo "Services: matching-sessions-service | friendship-service | user-account-service"
      echo "Modes:"
      echo "  local (default): runs npm test in each service on host machine"
      echo "  docker: runs tests via docker compose run --rm"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ "$MODE" != "local" && "$MODE" != "docker" ]]; then
  echo "Unsupported mode: $MODE (expected local|docker)" >&2
  exit 1
fi

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

run_local() {
  for svc in "${SERVICES[@]}"; do
    echo
    echo "===================================================="
    echo "Running unit tests locally for: $svc"
    echo "===================================================="
    (
      cd "$ROOT_DIR/services/$svc"
      npm test
    )
  done
}

run_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker CLI is not available in this environment." >&2
    echo "Use local mode instead: ./tools/tests/run-unit-tests.sh --mode local" >&2
    exit 1
  fi

  BASE_ARGS=(--env-file .env.dev -f docker-compose.dev.yaml -f ./databases/docker-compose-db.dev.yaml)

  if [[ "$NO_BUILD" -eq 0 ]]; then
    echo "Building test service images..."
    docker compose "${BASE_ARGS[@]}" build "${SERVICES[@]}"
  fi

  for svc in "${SERVICES[@]}"; do
    echo
    echo "===================================================="
    echo "Running unit tests in Docker for: $svc"
    echo "===================================================="
    docker compose "${BASE_ARGS[@]}" run --rm "$svc" npm test
  done
}

if [[ "$MODE" == "docker" ]]; then
  run_docker
else
  run_local
fi

echo
echo "All requested unit tests passed."
