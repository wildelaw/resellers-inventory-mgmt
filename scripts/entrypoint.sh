#!/bin/sh
set -e

echo "Running database migrations..."
node scripts/migrate-runner.js

echo "Starting Next.js server..."
exec node server.js