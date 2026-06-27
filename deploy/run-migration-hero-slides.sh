#!/bin/bash
# 서버에서 hero slides migration 실행 (IPv6 direct DB)
set -euo pipefail

ROOT="/var/www/purple-lease"
SQL="$ROOT/supabase/migration-hero-slides.sql"
PASS="${SUPABASE_DB_PASSWORD:-}"
DB="postgresql://postgres@db.zliclwgiaqvilnnookyi.supabase.co:5432/postgres?sslmode=require"

if [ -z "$PASS" ]; then
  echo "[migrate-hero] SUPABASE_DB_PASSWORD 필요"
  exit 1
fi
if [ ! -f "$SQL" ]; then
  echo "[migrate-hero] SQL 없음: $SQL"
  exit 1
fi

export PGPASSWORD="$PASS"
psql "$DB" -v ON_ERROR_STOP=1 -f "$SQL"
psql "$DB" -c "SELECT COUNT(*) AS hero_slides_cnt FROM hero_slides;"
echo "[migrate-hero] OK"
