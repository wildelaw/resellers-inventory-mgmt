#!/bin/sh

# Container entrypoint: run migrations and start the app
set -e

echo "Running database migrations..."
node scripts/migrate-runner.js

echo "Starting application..."
exec node server.js