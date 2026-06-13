#!/bin/bash
# Generate AUTH_SECRET for NextAuth
# Usage: ./scripts/generate-secret.sh

echo "Generated AUTH_SECRET:"
openssl rand -base64 32