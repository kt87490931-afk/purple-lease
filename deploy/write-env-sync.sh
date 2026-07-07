#!/bin/bash
# Supabase 서비스 롤 키 → 서버 .env.sync (cron용, GitHub Secrets에서 주입)
set -euo pipefail

ENV_FILE="/var/www/purple-lease/.env.sync"

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "[env-sync] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — skip (기존 파일 유지)"
  exit 0
fi

# 기존 키 보존 (GitHub Secrets 미등록 시에도 유지) — 회귀 방지
PRESERVE_TELEGRAM_BOT=""
PRESERVE_TELEGRAM_CHAT=""
PRESERVE_TELEGRAM_SECRET=""
PRESERVE_GEMINI=""
PRESERVE_ANON=""
if [ -f "$ENV_FILE" ]; then
  PRESERVE_TELEGRAM_BOT=$(grep '^TELEGRAM_BOT_TOKEN=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
  PRESERVE_TELEGRAM_CHAT=$(grep '^TELEGRAM_CHAT_ID=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
  PRESERVE_TELEGRAM_SECRET=$(grep '^TELEGRAM_WEBHOOK_SECRET=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
  PRESERVE_GEMINI=$(grep '^GEMINI_API_KEY=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
  PRESERVE_ANON=$(grep '^SUPABASE_ANON_KEY=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
fi

TG_BOT="${TELEGRAM_BOT_TOKEN:-$PRESERVE_TELEGRAM_BOT}"
TG_CHAT="${TELEGRAM_CHAT_ID:-$PRESERVE_TELEGRAM_CHAT}"
TG_SECRET="${TELEGRAM_WEBHOOK_SECRET:-$PRESERVE_TELEGRAM_SECRET}"
GEMINI_KEY="${GEMINI_API_KEY:-$PRESERVE_GEMINI}"
ANON_KEY="${SUPABASE_ANON_KEY:-$PRESERVE_ANON}"

umask 077
{
  echo "SUPABASE_URL=${SUPABASE_URL}"
  echo "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}"
  if [ -n "$ANON_KEY" ]; then
    echo "SUPABASE_ANON_KEY=${ANON_KEY}"
  fi
  if [ -n "$GEMINI_KEY" ]; then
    echo "GEMINI_API_KEY=${GEMINI_KEY}"
  fi
  if [ -n "$TG_BOT" ]; then
    echo "TELEGRAM_BOT_TOKEN=${TG_BOT}"
  fi
  if [ -n "$TG_CHAT" ]; then
    echo "TELEGRAM_CHAT_ID=${TG_CHAT}"
  fi
  if [ -n "$TG_SECRET" ]; then
    echo "TELEGRAM_WEBHOOK_SECRET=${TG_SECRET}"
  fi
  echo "REVIEW_DAILY_MAX=${REVIEW_DAILY_MAX:-2}"
} > "$ENV_FILE"
chmod 600 "$ENV_FILE"
chown root:root "$ENV_FILE"
echo "[env-sync] wrote $ENV_FILE"
