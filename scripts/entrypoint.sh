#!/bin/sh
set -e

echo "Running migrations..."
node scripts/migrate-runner.js

echo "Starting application..."
exec node server.js