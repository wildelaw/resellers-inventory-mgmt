#!/bin/sh
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/uat.key -out certs/uat.pem \
  -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/OU=Org/CN=localhost"
echo "Self-signed certificate generated in certs/"
