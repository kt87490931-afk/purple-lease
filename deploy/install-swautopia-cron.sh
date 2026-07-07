#!/bin/bash
# swautopia 중고차 동기화 cron — KST 04:00 하루 1회
set -euo pipefail

ROOT="/var/www/purple-lease"
SCRIPT="$ROOT/deploy/run-swautopia-sync.sh"
CRON_FILE="/etc/cron.d/purple-swautopia-sync"

if [ ! -f "$SCRIPT" ]; then
  echo "[swautopia-cron] script missing: $SCRIPT"
  exit 1
fi

chmod +x "$SCRIPT"

printf '%s\n' \
  'SHELL=/bin/bash' \
  'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' \
  'CRON_TZ=Asia/Seoul' \
  '' \
  '# KST 04:00 — swautopia 전체 동기화 (매물+사진)' \
  "0 4 * * * root bash $SCRIPT >> /var/log/purple-swautopia-sync.log 2>&1" \
  > "$CRON_FILE"

chmod 644 "$CRON_FILE"

# 구 root crontab 항목 제거
crontab -l 2>/dev/null | grep -v 'sync-swautopia-cars.js' | crontab - 2>/dev/null || true

echo "[swautopia-cron] OK — CRON_TZ=Asia/Seoul KST 04:00 daily → $CRON_FILE"
