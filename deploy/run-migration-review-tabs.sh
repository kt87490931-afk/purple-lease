#!/bin/bash
# 퍼플리뷰 탭 CMS migration
set -euo pipefail

ROOT="/var/www/purple-lease"
SQL="$ROOT/supabase/migration-review-tabs.sql"
PASS="${SUPABASE_DB_PASSWORD:-}"

if [ -z "$PASS" ]; then
  echo "[migrate-review-tabs] SUPABASE_DB_PASSWORD required"
  exit 1
fi
if [ ! -f "$SQL" ]; then
  echo "[migrate-review-tabs] SQL not found: $SQL"
  exit 1
fi

export PGPASSWORD="$PASS"
psql "postgresql://postgres@db.zliclwgiaqvilnnookyi.supabase.co:5432/postgres?sslmode=require" \
  -v ON_ERROR_STOP=1 \
  -f "$SQL"

echo "[migrate-review-tabs] OK"
