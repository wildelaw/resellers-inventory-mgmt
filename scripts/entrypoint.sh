#!/bin/sh
set -e
echo "Running migrations..."
node scripts/migrate-runner.js
echo "Starting server..."
exec node server.js
