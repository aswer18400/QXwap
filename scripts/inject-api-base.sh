#!/bin/bash
# inject-api-base.sh - Inject API_BASE_URL into built index.html
# Usage: ./scripts/inject-api-base.sh https://api.example.com/api

API_BASE="${1:-/api}"
INDEX_FILE="${2:-dist/public/index.html}"

if [ ! -f "$INDEX_FILE" ]; then
  echo "Error: $INDEX_FILE not found. Run 'npm run build' first."
  exit 1
fi

# Escape for sed
ESCAPED=$(echo "$API_BASE" | sed 's/[\/&]/\\&/g')
sed -i "s|__API_BASE__|$ESCAPED|g" "$INDEX_FILE"

echo "Injected API_BASE = $API_BASE into $INDEX_FILE"
