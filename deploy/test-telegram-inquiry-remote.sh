#!/bin/bash
# 원격 텔레그램 견적문의 웹훅 상태·테스트
set -euo pipefail

ENV="/var/www/purple-lease/.env.sync"
if [ -f "$ENV" ]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV"
  set +a
fi

echo "=== service ==="
systemctl is-active purple-inquiry-telegram.service 2>/dev/null || echo "inactive"

echo "=== health ==="
curl -sS http://127.0.0.1:8793/health 2>/dev/null || echo "health unreachable"

if [ -n "${TELEGRAM_WEBHOOK_SECRET:-}" ]; then
  echo "=== test send ==="
  curl -sS -X POST http://127.0.0.1:8793/api/webhook/inquiry-telegram/test \
    -H "X-Webhook-Secret: ${TELEGRAM_WEBHOOK_SECRET}" || true
  echo ""
fi
