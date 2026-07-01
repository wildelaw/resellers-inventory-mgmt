#!/bin/sh
set -e

echo "Running database migrations..."
node scripts/migrate-runner.js

echo "Starting application..."
exec node server.js