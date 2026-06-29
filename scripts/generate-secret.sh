#!/bin/sh
# Generate a random AUTH_SECRET for NextAuth JWT signing.
set -e
if [ -f .env.local ]; then
  echo ".env.local already exists. Edit it manually to update AUTH_SECRET."
  exit 1
fi
SECRET=$(openssl rand -base64 32)
cat > .env.local << EOF
AUTH_SECRET=$SECRET
AUTH_URL=http://localhost:3000
# Set COOKIE_SECURE=false for HTTP-only dev
COOKIE_SECURE=false
EOF
echo "Generated .env.local with AUTH_SECRET."