#!/bin/bash
# 서버에서 analytics migration 실행 (IPv6 direct DB + psql)
set -euo pipefail

ROOT="/var/www/purple-lease"
SQL="$ROOT/supabase/migration-analytics.sql"
PASS="${SUPABASE_DB_PASSWORD:-}"
DB="postgresql://postgres@db.zliclwgiaqvilnnookyi.supabase.co:5432/postgres?sslmode=require"

if [ -z "$PASS" ]; then
  echo "[migrate-analytics] SUPABASE_DB_PASSWORD 필요"
  exit 1
fi
if [ ! -f "$SQL" ]; then
  echo "[migrate-analytics] SQL 없음: $SQL"
  exit 1
fi

export PGPASSWORD="$PASS"
psql "$DB" -v ON_ERROR_STOP=1 -f "$SQL"
psql "$DB" -c "SELECT COUNT(*) AS visit_logs_cnt FROM visit_logs; SELECT proname FROM pg_proc WHERE proname LIKE 'get_analytics_%';"
echo "[migrate-analytics] OK"
