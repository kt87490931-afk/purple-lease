#!/bin/bash
# Supabase telegram_notify_config 에 웹훅 시크릿·URL 반영 (pg_net 트리거용)
# 사용: bash deploy/sync-telegram-webhook-secret.sh 'WEBHOOK_SECRET'
set -euo pipefail

SECRET="${1:-}"
ENV="/var/www/purple-lease/.env.sync"
URL="${TELEGRAM_WEBHOOK_URL:-https://purpleauto.co.kr/api/webhook/inquiry-telegram}"

if [ -z "$SECRET" ] && [ -f "$ENV" ]; then
  SECRET=$(grep '^TELEGRAM_WEBHOOK_SECRET=' "$ENV" 2>/dev/null | cut -d= -f2- || true)
fi

if [ -z "$SECRET" ]; then
  echo "[sync-telegram] WEBHOOK_SECRET missing"
  exit 1
fi

if [ -f "$ENV" ]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV"
  set +a
fi

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "[sync-telegram] SUPABASE_URL / SERVICE_ROLE_KEY missing — skip"
  exit 0
fi

SB="${SUPABASE_URL%/}/rest/v1"
HDR=(-H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates")

upsert_config() {
  local key="$1"
  local value="$2"
  curl -sS -X POST "${SB}/telegram_notify_config" \
    "${HDR[@]}" \
    -d "[{\"key\":\"${key}\",\"value\":\"${value}\"}]" >/dev/null
}

upsert_config "webhook_url" "$URL"
upsert_config "webhook_secret" "$SECRET"

echo "[sync-telegram] telegram_notify_config updated"
