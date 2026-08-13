#!/bin/bash
# 서버에서 hero slide link_url migration 실행
set -euo pipefail

ROOT="/var/www/purple-lease"
SQL="$ROOT/supabase/migration-hero-slide-link.sql"
PASS="${SUPABASE_DB_PASSWORD:-}"
DB="postgresql://postgres@db.zliclwgiaqvilnnookyi.supabase.co:5432/postgres?sslmode=require"

if [ -z "$PASS" ]; then
  echo "[migrate-hero-link] SUPABASE_DB_PASSWORD 필요"
  exit 1
fi
if [ ! -f "$SQL" ]; then
  echo "[migrate-hero-link] SQL 없음: $SQL"
  exit 1
fi

export PGPASSWORD="$PASS"
psql "$DB" -v ON_ERROR_STOP=1 -f "$SQL"
psql "$DB" -c "SELECT column_name FROM information_schema.columns WHERE table_name='hero_slides' AND column_name='link_url';"
echo "[migrate-hero-link] OK"
