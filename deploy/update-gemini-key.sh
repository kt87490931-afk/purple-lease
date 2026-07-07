#!/bin/bash
# Gemini API 키 서버 반영 (키는 인자로만 전달 — 파일에 저장하지 않음)
# 사용: bash deploy/update-gemini-key.sh 'AIzaSy...'
set -euo pipefail

NEW_KEY="${1:-}"
ENV="/var/www/purple-lease/.env.sync"

if [ -z "$NEW_KEY" ]; then
  echo "Usage: bash deploy/update-gemini-key.sh 'YOUR_GEMINI_API_KEY'"
  exit 1
fi

if [ ! -f "$ENV" ]; then
  echo "missing $ENV"
  exit 1
fi

# 키 유효성 간단 검사
HTTP=$(curl -s -w "\n%{http_code}" \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${NEW_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"ok"}]}]}')
CODE=$(echo "$HTTP" | tail -n1)
if [ "$CODE" != "200" ]; then
  echo "GEMINI_KEY_INVALID http=$CODE"
  echo "$HTTP" | sed '$d' | head -c 300
  exit 2
fi

if grep -q '^GEMINI_API_KEY=' "$ENV"; then
  sed -i "s/^GEMINI_API_KEY=.*/GEMINI_API_KEY=${NEW_KEY}/" "$ENV"
else
  echo "GEMINI_API_KEY=${NEW_KEY}" >> "$ENV"
fi
chmod 600 "$ENV"
systemctl restart purple-review-gen-api.service 2>/dev/null || true
echo "GEMINI_KEY_OK"
