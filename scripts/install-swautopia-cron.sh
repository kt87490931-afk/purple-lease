#!/bin/bash
# swautopia 중고차 동기화 크론 등록 (서버에서 root/sudo로 1회 실행)
# 0 */6 * * * → 0, 6, 12, 18시

ENV_FILE="/var/www/purple-lease/.env.sync"
CRON_LINE="0 */6 * * * cd /var/www/purple-lease && /usr/bin/node scripts/sync-swautopia-cars.js >> /var/log/purple-swautopia-sync.log 2>&1"

if [ ! -f "$ENV_FILE" ]; then
  echo "먼저 $ENV_FILE 파일을 만드세요:"
  echo "  SUPABASE_URL=https://xxx.supabase.co"
  echo "  SUPABASE_SERVICE_ROLE_KEY=eyJ..."
  exit 1
fi

WRAPPED="0 */6 * * * . $ENV_FILE && cd /var/www/purple-lease && /usr/bin/node scripts/sync-swautopia-cars.js >> /var/log/purple-swautopia-sync.log 2>&1"

( crontab -l 2>/dev/null | grep -v 'sync-swautopia-cars.js'; echo "$WRAPPED" ) | crontab -
echo "크론 등록 완료:"
crontab -l | grep swautopia
