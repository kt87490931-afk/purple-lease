#!/bin/bash
# 퍼플오토 고객후기 AI 생성 실행 (cron·수동 서버 테스트)
set -euo pipefail

ROOT="/var/www/purple-lease"
ENV_FILE="$ROOT/.env.sync"
LOG_TAG="[review-gen]"

if [ ! -f "$ENV_FILE" ]; then
  echo "$LOG_TAG missing $ENV_FILE — deploy secrets 또는 수동 생성 필요"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "$LOG_TAG SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required in $ENV_FILE"
  exit 1
fi

if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "$LOG_TAG GEMINI_API_KEY required in $ENV_FILE"
  exit 1
fi

NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  echo "$LOG_TAG node not found — run deploy/install-node.sh"
  exit 1
fi

cd "$ROOT"
echo "$LOG_TAG start $(date -Iseconds) node=$($NODE_BIN -v) args=$*"
exec "$NODE_BIN" "$ROOT/scripts/generate-customer-review.js" "$@"
