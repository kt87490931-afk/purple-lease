#!/bin/bash
# sitemap Storage → 서버 동기화 cron 등록 (5분마다)
set -euo pipefail

SCRIPT="/var/www/purple-lease/deploy/sync-sitemap-from-storage.sh"
CRON_LINE="*/5 * * * * root bash $SCRIPT >> /var/log/purple-sync-sitemap.log 2>&1"
CRON_FILE="/etc/cron.d/purple-sync-sitemap"

if [ ! -f "$SCRIPT" ]; then
  echo "[sitemap-cron] script missing: $SCRIPT"
  exit 1
fi

chmod +x "$SCRIPT"
echo "$CRON_LINE" > "$CRON_FILE"
chmod 644 "$CRON_FILE"
echo "[sitemap-cron] OK — every 5 minutes"
