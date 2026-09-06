#!/bin/sh
# Generates a self-signed TLS certificate for local/UAT use into ./certs.
# Production should use real certificates instead (TLS_CERT/TLS_KEY env vars).
set -e

CERT_DIR="${1:-certs}"
CERT="${CERT_DIR}/uat.pem"
KEY="${CERT_DIR}/uat.key"

mkdir -p "$CERT_DIR"

if [ -f "$CERT" ] && [ -f "$KEY" ]; then
  echo "Certificate already exists: $CERT"
  exit 0
fi

openssl req -x509 -newkey rsa:2048 -sha256 -days 825 -nodes \
  -keyout "$KEY" -out "$CERT" \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

chmod 600 "$KEY"
echo "Self-signed certificate written to $CERT and $KEY"