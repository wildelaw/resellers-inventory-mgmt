#!/bin/sh
if [ -z "$AUTH_SECRET" ]; then
  echo "Generating AUTH_SECRET..."
  openssl rand -base64 32
else
  echo "$AUTH_SECRET"
fi
