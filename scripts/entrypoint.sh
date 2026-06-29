#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
node scripts/migrate-runner.js

echo "[entrypoint] Starting Next.js server..."
exec node server.js