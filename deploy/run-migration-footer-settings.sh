#!/bin/bash
# 푸터 설정 migration (footer_settings)
set -euo pipefail

ROOT="/var/www/purple-lease"
SQL="$ROOT/supabase/migration-footer-settings.sql"
PASS="${SUPABASE_DB_PASSWORD:-}"

if [ -z "$PASS" ]; then
  echo "[migrate-footer-settings] SUPABASE_DB_PASSWORD required"
  exit 1
fi
if [ ! -f "$SQL" ]; then
  echo "[migrate-footer-settings] SQL not found: $SQL"
  exit 1
fi

export PGPASSWORD="$PASS"
psql "postgresql://postgres@db.zliclwgiaqvilnnookyi.supabase.co:5432/postgres?sslmode=require" \
  -v ON_ERROR_STOP=1 \
  -f "$SQL"

psql "postgresql://postgres@db.zliclwgiaqvilnnookyi.supabase.co:5432/postgres?sslmode=require" \
  -c "SELECT id, length(disclaimer_text) AS disclaimer_len, certificate_url IS NOT NULL AS has_cert FROM footer_settings WHERE id=1;"

echo "[migrate-footer-settings] OK"
