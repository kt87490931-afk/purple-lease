#!/bin/bash
# Telegram Bot update 웹훅 재등록 (/테스트, /리스트)
set -euo pipefail

ENV="/var/www/purple-lease/.env.sync"
if [ -f "$ENV" ]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV"
  set +a
fi

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_WEBHOOK_SECRET:-}" ]; then
  echo "TELEGRAM_BOT_TOKEN / TELEGRAM_WEBHOOK_SECRET required in $ENV"
  exit 1
fi

RES=$(curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H 'Content-Type: application/json' \
  -d "{\"url\":\"https://purpleauto.co.kr/api/webhook/telegram-bot\",\"secret_token\":\"${TELEGRAM_WEBHOOK_SECRET}\",\"allowed_updates\":[\"message\"],\"drop_pending_updates\":true}")

echo "$RES"
echo "$RES" | grep -q '"ok":true' && echo "BOT_WEBHOOK_OK" || exit 1
