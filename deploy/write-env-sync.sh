#!/bin/bash
# Supabase 서비스 롤 키 → 서버 .env.sync (cron용, GitHub Secrets에서 주입)
set -euo pipefail

ENV_FILE="/var/www/purple-lease/.env.sync"

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "[env-sync] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — skip (기존 파일 유지)"
  exit 0
fi

umask 077
cat > "$ENV_FILE" << EOF
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
EOF
chmod 600 "$ENV_FILE"
echo "[env-sync] wrote $ENV_FILE"
