#!/bin/bash
# 제휴업체 migration (상단영상 · 지역 · 해시태그 · 업체)
set -euo pipefail

ROOT="/var/www/purple-lease"
SQL="$ROOT/supabase/migration-partners.sql"
PASS="${SUPABASE_DB_PASSWORD:-}"

if [ -z "$PASS" ]; then
  echo "[migrate-partners] SUPABASE_DB_PASSWORD required"
  exit 1
fi
if [ ! -f "$SQL" ]; then
  echo "[migrate-partners] SQL not found: $SQL"
  exit 1
fi

export PGPASSWORD="$PASS"
psql "postgresql://postgres@db.zliclwgiaqvilnnookyi.supabase.co:5432/postgres?sslmode=require" \
  -v ON_ERROR_STOP=1 \
  -f "$SQL"

psql "postgresql://postgres@db.zliclwgiaqvilnnookyi.supabase.co:5432/postgres?sslmode=require" \
  -c "SELECT (SELECT COUNT(*) FROM partner_tags) AS tags, (SELECT COUNT(*) FROM partner_regions) AS regions, (SELECT COUNT(*) FROM partners) AS partners;"

echo "[migrate-partners] OK"
