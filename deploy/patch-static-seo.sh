#!/bin/bash
# DB SEO → 공개 HTML 정적 meta 반영 (카카오·SNS 크롤러용)
set -euo pipefail

ROOT="/var/www/purple-lease"
SCRIPT="$ROOT/scripts/patch-static-seo.py"
FORCE="${1:-}"

export WEB_ROOT="$ROOT"
export SUPABASE_URL="${SUPABASE_URL:-https://zliclwgiaqvilnnookyi.supabase.co}"

if [ -z "${SUPABASE_ANON_KEY:-}" ] && [ -f "$ROOT/js/supabase-config.js" ]; then
  export SUPABASE_ANON_KEY="$(grep -o "anonKey: '[^']*'" "$ROOT/js/supabase-config.js" | head -1 | cut -d"'" -f2)"
fi

REQ_URL="${SUPABASE_URL}/storage/v1/object/public/purple-uploads/seo/patch-request.json"
if [ "$FORCE" != "--force" ] && curl -sf "$REQ_URL" -o /dev/null 2>/dev/null; then
  FORCE="--force"
fi

if [ ! -f "$SCRIPT" ]; then
  echo "[patch-static-seo] missing $SCRIPT"
  exit 1
fi
if [ -z "${SUPABASE_ANON_KEY:-}" ]; then
  echo "[patch-static-seo] SUPABASE_ANON_KEY required"
  exit 1
fi

if [ "$FORCE" = "--force" ]; then
  python3 "$SCRIPT" --force
else
  python3 "$SCRIPT"
fi
