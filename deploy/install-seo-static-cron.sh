#!/bin/bash
# SEO 정적 HTML 자동 반영 cron (3분마다)
set -euo pipefail

SCRIPT="/var/www/purple-lease/deploy/patch-static-seo.sh"
CRON_LINE="*/3 * * * * root SUPABASE_URL=https://zliclwgiaqvilnnookyi.supabase.co bash $SCRIPT >> /var/log/purple-patch-seo.log 2>&1"
CRON_FILE="/etc/cron.d/purple-patch-seo"

if [ ! -f "$SCRIPT" ]; then
  echo "[seo-static-cron] script missing: $SCRIPT"
  exit 1
fi

chmod +x "$SCRIPT"
echo "$CRON_LINE" > "$CRON_FILE"
chmod 644 "$CRON_FILE"
echo "[seo-static-cron] OK — every 3 minutes"
