#!/bin/bash
# 고객후기 AI 생성 cron — 자동 4회 시도/일 (09:00·13:00·17:00·21:00 KST) + 큐 처리(5분)
# 실제 게시 수는 js/customer-review-generator.js 의 일일 한도·간격이 결정
#   - 한시 증량 기간(REVIEW_BOOST_UNTIL): 하루 4건 · 4시간 간격 → 4회 모두 게시
#   - 평소: 하루 2건 · 12시간 간격 → 09:00·21:00 게시
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

# 자동 AI 후기 — KST 09:00·13:00·17:00·21:00 (= UTC 00:00·04:00·08:00·12:00)
0 0 * * * root bash $SCRIPT --auto-publish >> /var/log/purple-review-gen.log 2>&1
0 4 * * * root bash $SCRIPT --auto-publish >> /var/log/purple-review-gen.log 2>&1
0 8 * * * root bash $SCRIPT --auto-publish >> /var/log/purple-review-gen.log 2>&1
0 12 * * * root bash $SCRIPT --auto-publish >> /var/log/purple-review-gen.log 2>&1

# 어드민 큐 (레거시) — 5분마다 pending 1건
*/5 * * * * root bash $SCRIPT --process-queue --limit=1 >> /var/log/purple-review-gen.log 2>&1
EOF

chmod 644 "$CRON_FILE"
echo "[review-gen-cron] OK — auto 09/13/17/21 KST + queue every 5 min → $CRON_FILE"
