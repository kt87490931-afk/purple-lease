#!/bin/bash
# 견적서 저장 테이블 migration (estimates)
set -euo pipefail

ROOT="/var/www/purple-lease"
SQL="$ROOT/supabase/migration-estimates.sql"
PASS="${SUPABASE_DB_PASSWORD:-}"

if [ -z "$PASS" ]; then
  echo "[migrate-estimates] SUPABASE_DB_PASSWORD required"
  exit 1
fi
if [ ! -f "$SQL" ]; then
  echo "[migrate-estimates] SQL not found: $SQL"
  exit 1
fi

export PGPASSWORD="$PASS"
psql "postgresql://postgres@db.zliclwgiaqvilnnookyi.supabase.co:5432/postgres?sslmode=require" \
  -v ON_ERROR_STOP=1 \
  -f "$SQL"

psql "postgresql://postgres@db.zliclwgiaqvilnnookyi.supabase.co:5432/postgres?sslmode=require" \
  -c "SELECT COUNT(*) AS estimates FROM estimates;"

echo "[migrate-estimates] OK"
