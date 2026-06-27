#!/bin/bash
# SEO meta v2 migration (keywords, OG/Twitter description + document copy)
set -euo pipefail

ROOT="/var/www/purple-lease"
SQL="$ROOT/supabase/migration-seo-meta-v2.sql"
PASS="${SUPABASE_DB_PASSWORD:-}"

if [ -z "$PASS" ]; then
  echo "[migrate-seo-meta-v2] SUPABASE_DB_PASSWORD required"
  exit 1
fi
if [ ! -f "$SQL" ]; then
  echo "[migrate-seo-meta-v2] SQL not found: $SQL"
  exit 1
fi

export PGPASSWORD="$PASS"
psql "postgresql://postgres@db.zliclwgiaqvilnnookyi.supabase.co:5432/postgres?sslmode=require" \
  -v ON_ERROR_STOP=1 \
  -f "$SQL"

psql "postgresql://postgres@db.zliclwgiaqvilnnookyi.supabase.co:5432/postgres?sslmode=require" \
  -c "SELECT page_path, LEFT(title,40) AS title FROM seo_page_meta ORDER BY page_path LIMIT 6;"

echo "[migrate-seo-meta-v2] OK"
