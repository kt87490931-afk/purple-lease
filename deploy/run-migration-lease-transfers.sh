#!/bin/bash
# 리스 · 장기렌트 일반승계 매물 migration (lease_transfers)
set -euo pipefail

ROOT="/var/www/purple-lease"
SQL="$ROOT/supabase/migration-lease-transfers.sql"
PASS="${SUPABASE_DB_PASSWORD:-}"

if [ -z "$PASS" ]; then
  echo "[migrate-lease-transfers] SUPABASE_DB_PASSWORD required"
  exit 1
fi
if [ ! -f "$SQL" ]; then
  echo "[migrate-lease-transfers] SQL not found: $SQL"
  exit 1
fi

export PGPASSWORD="$PASS"
psql "postgresql://postgres@db.zliclwgiaqvilnnookyi.supabase.co:5432/postgres?sslmode=require" \
  -v ON_ERROR_STOP=1 \
  -f "$SQL"

psql "postgresql://postgres@db.zliclwgiaqvilnnookyi.supabase.co:5432/postgres?sslmode=require" \
  -c "SELECT COUNT(*) AS lease_transfer_count FROM lease_transfers;"

echo "[migrate-lease-transfers] OK"
