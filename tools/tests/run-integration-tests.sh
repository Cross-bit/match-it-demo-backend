#!/bin/bash

set -euo pipefail

# Runs integration test projects from /integration.
# - config-integrity-test
# - api-tests
#
# Usage:
#   ./tools/tests/run-integration-tests.sh
#   ./tools/tests/run-integration-tests.sh --config-only
#   ./tools/tests/run-integration-tests.sh --api-only
#   ./tools/tests/run-integration-tests.sh --with-stack

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

RUN_CONFIG=1
RUN_API=1
WITH_STACK=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config-only)
      RUN_CONFIG=1
      RUN_API=0
      shift
      ;;
    --api-only)
      RUN_CONFIG=0
      RUN_API=1
      shift
      ;;
    --with-stack)
      WITH_STACK=1
      shift
      ;;
    -h|--help)
      echo "Usage: ./tools/tests/run-integration-tests.sh [--config-only|--api-only] [--with-stack]"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

# Integration projects expect .env.test.
if [[ ! -f ".env.test" ]]; then
  if [[ -f ".env.dev" ]]; then
    cp ".env.dev" ".env.test"
    echo "Created .env.test from .env.dev"
  else
    cp ".env.example" ".env.test"
    echo "Created .env.test from .env.example"
  fi
fi

if [[ "$WITH_STACK" -eq 1 ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is required for --with-stack mode." >&2
    exit 1
  fi
  echo "Starting backend stack for integration API tests..."
  ./tools/build/compose.sh --dev up -d
fi

run_npm_project_tests() {
  local project_dir="$1"
  echo
  echo "===================================================="
  echo "Running integration project: $project_dir"
  echo "===================================================="
  (
    cd "$project_dir"
    npm install --no-audit --no-fund
    npm test -- --runInBand
  )
}

if [[ "$RUN_CONFIG" -eq 1 ]]; then
  run_npm_project_tests "$ROOT_DIR/integration/config-integrity-test"
fi

if [[ "$RUN_API" -eq 1 ]]; then
  run_npm_project_tests "$ROOT_DIR/integration/api-tests"
fi

echo
echo "Integration test run completed."
