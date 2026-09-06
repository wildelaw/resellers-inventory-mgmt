#!/bin/sh
# Generates a random AUTH_SECRET for NextAuth JWT signing
echo "AUTH_SECRET=$(openssl rand -base64 32)"