#!/bin/sh
# Generate a random AUTH_SECRET and write to .env.local if not present.
if [ -f .env.local ] && grep -q "AUTH_SECRET" .env.local; then
  echo "AUTH_SECRET already set in .env.local"
  grep "AUTH_SECRET" .env.local
  exit 0
fi
SECRET=$(openssl rand -base64 32)
if [ -f .env.local ]; then
  echo "AUTH_SECRET=$SECRET" >> .env.local
else
  echo "AUTH_SECRET=$SECRET" > .env.local
fi
echo "Generated AUTH_SECRET and saved to .env.local"
