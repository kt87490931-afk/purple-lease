#!/bin/bash
# 서버에서 SEO migration 실행 (IPv6 direct DB)
set -euo pipefail

ROOT="/var/www/purple-lease"
SQL="$ROOT/supabase/migration-seo.sql"
PASS="${SUPABASE_DB_PASSWORD:-}"

if [ -z "$PASS" ]; then
  echo "[migrate-seo] SUPABASE_DB_PASSWORD 필요"
  exit 1
fi
if [ ! -f "$SQL" ]; then
  echo "[migrate-seo] SQL 없음: $SQL"
  exit 1
fi

export PGPASSWORD="$PASS"
psql "postgresql://postgres@db.zliclwgiaqvilnnookyi.supabase.co:5432/postgres?sslmode=require" \
  -v ON_ERROR_STOP=1 \
  -f "$SQL"

psql "postgresql://postgres@db.zliclwgiaqvilnnookyi.supabase.co:5432/postgres?sslmode=require" \
  -c "SELECT id, site_name FROM seo_settings WHERE id=1; SELECT COUNT(*) AS page_meta_cnt FROM seo_page_meta;"

echo "[migrate-seo] OK"
