#!/bin/bash
# 텔레그램 봇·채팅·웹훅 시크릿 서버 반영 + Supabase 트리거 설정 동기화
# 사용: bash deploy/update-telegram-config.sh 'BOT_TOKEN' 'CHAT_ID' [WEBHOOK_SECRET]
set -euo pipefail

BOT_TOKEN="${1:-}"
CHAT_ID="${2:-}"
WEBHOOK_SECRET="${3:-}"
ENV="/var/www/purple-lease/.env.sync"
ROOT="/var/www/purple-lease"

if [ -z "$BOT_TOKEN" ] || [ -z "$CHAT_ID" ]; then
  echo "Usage: bash deploy/update-telegram-config.sh 'BOT_TOKEN' 'CHAT_ID' [WEBHOOK_SECRET]"
  exit 1
fi

if [ ! -f "$ENV" ]; then
  echo "missing $ENV"
  exit 1
fi

# 봇 토큰 유효성
HTTP=$(curl -s -w "\n%{http_code}" "https://api.telegram.org/bot${BOT_TOKEN}/getMe")
CODE=$(echo "$HTTP" | tail -n1)
BODY=$(echo "$HTTP" | sed '$d')
if [ "$CODE" != "200" ] || ! echo "$BODY" | grep -q '"ok":true'; then
  echo "TELEGRAM_BOT_INVALID http=$CODE"
  echo "$BODY" | head -c 300
  exit 2
fi

# 테스트 메시지 (선택)
SEND=$(curl -s -w "\n%{http_code}" -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -H 'Content-Type: application/json' \
  -d "{\"chat_id\":\"${CHAT_ID}\",\"text\":\"✅ 퍼플오토 견적문의 텔레그램 알림 연결 테스트\",\"disable_web_page_preview\":true}")
SEND_CODE=$(echo "$SEND" | tail -n1)
if [ "$SEND_CODE" != "200" ]; then
  echo "TELEGRAM_CHAT_INVALID http=$SEND_CODE"
  echo "$SEND" | sed '$d' | head -c 400
  echo ""
  echo "힌트: 봇을 그룹/채널에 초대한 뒤 그룹에서 메시지를 보내고 chat_id를 확인하세요."
  exit 3
fi

upsert_env() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV"
  else
    echo "${key}=${val}" >> "$ENV"
  fi
}

upsert_env "TELEGRAM_BOT_TOKEN" "$BOT_TOKEN"
upsert_env "TELEGRAM_CHAT_ID" "$CHAT_ID"

if [ -z "$WEBHOOK_SECRET" ]; then
  if grep -q '^TELEGRAM_WEBHOOK_SECRET=' "$ENV"; then
    WEBHOOK_SECRET=$(grep '^TELEGRAM_WEBHOOK_SECRET=' "$ENV" | cut -d= -f2-)
  else
    WEBHOOK_SECRET=$(openssl rand -hex 24)
    upsert_env "TELEGRAM_WEBHOOK_SECRET" "$WEBHOOK_SECRET"
    echo "[telegram] generated TELEGRAM_WEBHOOK_SECRET"
  fi
else
  upsert_env "TELEGRAM_WEBHOOK_SECRET" "$WEBHOOK_SECRET"
fi

chmod 600 "$ENV"
systemctl restart purple-inquiry-telegram.service 2>/dev/null || true

# Supabase pg_net 트리거 설정 동기화
if [ -f "$ROOT/deploy/sync-telegram-webhook-secret.sh" ]; then
  bash "$ROOT/deploy/sync-telegram-webhook-secret.sh" "$WEBHOOK_SECRET" 2>&1 || echo "[telegram] supabase secret sync skipped"
fi

# Telegram Bot 명령 수신 웹훅 등록 (/테스트, /리스트)
WH_SET=$(curl -sS -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H 'Content-Type: application/json' \
  -d "{\"url\":\"https://purpleauto.co.kr/api/webhook/telegram-bot\",\"secret_token\":\"${WEBHOOK_SECRET}\",\"allowed_updates\":[\"message\"],\"drop_pending_updates\":true}")
if echo "$WH_SET" | grep -q '"ok":true'; then
  echo "[telegram] bot webhook registered (telegram-bot)"
else
  echo "[telegram] bot webhook register failed: $WH_SET"
fi

echo "TELEGRAM_CONFIG_OK"
echo "WEBHOOK_URL=https://purpleauto.co.kr/api/webhook/inquiry-telegram"
echo "BOT_WEBHOOK_URL=https://purpleauto.co.kr/api/webhook/telegram-bot"
echo "WEBHOOK_SECRET=${WEBHOOK_SECRET}"
echo "COMMANDS=/테스트 /리스트"
