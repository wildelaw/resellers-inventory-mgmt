#!/bin/sh
# Generate a random AUTH_SECRET for NextAuth JWT signing.
if command -v openssl >/dev/null 2>&1; then
  openssl rand -base64 32
else
  # Fallback using /dev/urandom
  head -c 32 /dev/urandom | base64
fi