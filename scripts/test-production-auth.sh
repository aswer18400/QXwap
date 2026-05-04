#!/usr/bin/env bash
set -euo pipefail

API_BASE="${1:-https://qxwap-api.onrender.com/api}"
FRONTEND_ORIGIN="${2:-https://aswer1840.github.io}"
TS="$(date +%s)"
EMAIL="qxwap.test+${TS}@gmail.com"
PASSWORD="Test123456!"
JAR="$(mktemp)"

cleanup(){ rm -f "$JAR"; }
trap cleanup EXIT

echo "[1/5] health"
curl -fsS -i "$API_BASE/health"

echo "[2/5] cors preflight"
curl -fsS -i -X OPTIONS "$API_BASE/health" \
  -H "Origin: $FRONTEND_ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"

echo "[3/5] register $EMAIL"
curl -fsS -i -c "$JAR" -X POST "$API_BASE/auth/signup" \
  -H 'content-type: application/json' \
  -H "origin: $FRONTEND_ORIGIN" \
  --data "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"

echo "[4/5] login"
curl -fsS -i -c "$JAR" -b "$JAR" -X POST "$API_BASE/auth/signin" \
  -H 'content-type: application/json' \
  -H "origin: $FRONTEND_ORIGIN" \
  --data "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"

echo "[5/5] me (cookie session)"
curl -fsS -i -b "$JAR" -H "origin: $FRONTEND_ORIGIN" "$API_BASE/auth/me"

echo "PASS: production auth flow is reachable and session works"
