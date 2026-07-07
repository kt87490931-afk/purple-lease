#!/bin/bash
# 고객후기 AI 생성 cron — 자동 2건/일 (10:00·16:00 KST) + 큐 처리(5분)
set -euo pipefail

ROOT="/var/www/purple-lease"
SCRIPT="$ROOT/deploy/run-generate-review.sh"
CRON_FILE="/etc/cron.d/purple-review-gen"

if [ ! -f "$SCRIPT" ]; then
  echo "[review-gen-cron] script missing: $SCRIPT"
  exit 1
fi

chmod +x "$SCRIPT"

cat > "$CRON_FILE" << EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# 자동 AI 후기 — KST 10:00·16:00 (= UTC 01:00·07:00)
0 1 * * * root bash $SCRIPT --auto-publish >> /var/log/purple-review-gen.log 2>&1
0 7 * * * root bash $SCRIPT --auto-publish >> /var/log/purple-review-gen.log 2>&1

# 어드민 큐 (레거시) — 5분마다 pending 1건
*/5 * * * * root bash $SCRIPT --process-queue --limit=1 >> /var/log/purple-review-gen.log 2>&1
EOF

chmod 644 "$CRON_FILE"
echo "[review-gen-cron] OK — auto 10:00/16:00 KST + queue every 5 min → $CRON_FILE"
