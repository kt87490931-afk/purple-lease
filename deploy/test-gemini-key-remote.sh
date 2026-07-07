#!/bin/bash
set -e
source /var/www/purple-lease/.env.sync
KEY="${GEMINI_API_KEY}"
echo "key_prefix=${KEY:0:12}..."
HTTP=$(curl -s -w "\n%{http_code}" \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"say ok"}]}]}')
CODE=$(echo "$HTTP" | tail -n1)
BODY=$(echo "$HTTP" | sed '$d')
echo "http=$CODE"
echo "$BODY" | head -c 300
echo
