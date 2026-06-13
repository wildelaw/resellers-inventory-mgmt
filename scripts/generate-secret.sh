#!/bin/sh

# Generate AUTH_SECRET for production
echo "Generated AUTH_SECRET:"
openssl rand -base64 32