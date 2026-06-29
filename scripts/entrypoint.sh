#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
node ./scripts/migrate-runner.js || {
  echo "[entrypoint] WARNING: migrations failed; continuing anyway" >&2
}

echo "[entrypoint] Starting server..."
exec node server.js