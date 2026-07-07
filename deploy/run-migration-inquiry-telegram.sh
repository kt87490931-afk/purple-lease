#!/bin/bash
# Supabase migration-inquiry-telegram.sql 실행 (pg_net 트리거)
set -euo pipefail

ROOT="/var/www/purple-lease"
SQL="$ROOT/supabase/migration-inquiry-telegram.sql"
PASS="${SUPABASE_DB_PASSWORD:-}"

if [ -f "/var/www/purple-lease/.env.sync" ]; then
  # shellcheck disable=SC1090
  set -a
  source "/var/www/purple-lease/.env.sync"
  set +a
  PASS="${PASS:-${SUPABASE_DB_PASSWORD:-}}"
fi

if [ -z "$PASS" ]; then
  echo "[migrate-inquiry-telegram] SUPABASE_DB_PASSWORD required"
  echo "또는 Supabase SQL Editor에서 직접 실행: $SQL"
  exit 1
fi
if [ ! -f "$SQL" ]; then
  echo "[migrate-inquiry-telegram] SQL not found: $SQL"
  exit 1
fi

export PGPASSWORD="$PASS"
psql "postgresql://postgres@db.zliclwgiaqvilnnookyi.supabase.co:5432/postgres?sslmode=require" \
  -v ON_ERROR_STOP=1 \
  -f "$SQL"

psql "postgresql://postgres@db.zliclwgiaqvilnnookyi.supabase.co:5432/postgres?sslmode=require" \
  -c "SELECT key, CASE WHEN value = '' THEN '(empty)' ELSE 'set' END AS status FROM telegram_notify_config ORDER BY key;"

echo "[migrate-inquiry-telegram] OK"
