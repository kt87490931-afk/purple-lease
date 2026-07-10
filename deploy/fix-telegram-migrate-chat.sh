#!/bin/bash
# 그룹→슈퍼그룹 승격 시 chat_id 자동 갱신
set -euo pipefail

ENV="/var/www/purple-lease/.env.sync"
ROOT="/var/www/purple-lease"

if [ ! -f "$ENV" ]; then
  echo "[fix-migrate] missing $ENV"
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV"
set +a

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
  echo "[fix-migrate] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID missing"
  exit 1
fi

OLD_CHAT="$TELEGRAM_CHAT_ID"
echo "[fix-migrate] current chat_id=$OLD_CHAT"

RESP=$(curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H 'Content-Type: application/json' \
  -d "{\"chat_id\":\"${OLD_CHAT}\",\"text\":\"🔄 chat_id 마이그레이션 확인 중…\"}")

NEW_CHAT=""
if echo "$RESP" | grep -q '"ok":true'; then
  echo "[fix-migrate] chat_id still valid — no migration needed"
  exit 0
fi

NEW_CHAT=$(echo "$RESP" | node -e "
var d='';
process.stdin.on('data',function(c){d+=c});
process.stdin.on('end',function(){
  try {
    var j=JSON.parse(d);
    var p=j.parameters||{};
    if(p.migrate_to_chat_id) console.log(String(p.migrate_to_chat_id));
    else if(/supergroup/i.test(j.description||'')) process.exit(2);
  } catch(e) {}
});
")

if [ -z "$NEW_CHAT" ]; then
  echo "[fix-migrate] could not detect migrate_to_chat_id"
  echo "$RESP" | head -c 500
  echo ""
  echo "힌트: 그룹에서 /테스트 보낸 뒤 get-telegram-chat-id.sh 로 새 chat_id 확인"
  exit 3
fi

echo "[fix-migrate] migrate_to_chat_id=$NEW_CHAT"

if grep -q '^TELEGRAM_CHAT_ID=' "$ENV"; then
  sed -i "s|^TELEGRAM_CHAT_ID=.*|TELEGRAM_CHAT_ID=${NEW_CHAT}|" "$ENV"
else
  echo "TELEGRAM_CHAT_ID=${NEW_CHAT}" >> "$ENV"
fi

chmod 600 "$ENV"
systemctl restart purple-inquiry-telegram.service 2>/dev/null || true

if [ -f "$ROOT/deploy/register-telegram-bot-webhook.sh" ]; then
  bash "$ROOT/deploy/register-telegram-bot-webhook.sh" 2>&1 || true
fi

VERIFY=$(curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H 'Content-Type: application/json' \
  -d "{\"chat_id\":\"${NEW_CHAT}\",\"text\":\"✅ 퍼플오토 견적봇 chat_id 갱신 완료\\n이전: ${OLD_CHAT}\\n현재: ${NEW_CHAT}\\n/테스트 로 확인해 주세요.\"}")

if echo "$VERIFY" | grep -q '"ok":true'; then
  echo "[fix-migrate] OK — chat_id updated and test message sent"
  echo "OLD=$OLD_CHAT NEW=$NEW_CHAT"
  exit 0
fi

echo "[fix-migrate] updated env but verify send failed:"
echo "$VERIFY" | head -c 400
exit 4
