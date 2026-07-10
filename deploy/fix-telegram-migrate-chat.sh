#!/bin/bash
# 그룹→슈퍼그룹 승격 시 chat_id 자동 갱신 (채팅 알림 없음 — 고객 견적문의 INSERT 알림만 Telegram 전송)
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

# sendMessage 대신 getChat — 그룹에 알림 메시지를 보내지 않음
RESP=$(curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChat?chat_id=${OLD_CHAT}")

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

VERIFY=$(curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChat?chat_id=${NEW_CHAT}")

if echo "$VERIFY" | grep -q '"ok":true'; then
  echo "[fix-migrate] OK — chat_id updated (no Telegram notification sent)"
  echo "OLD=$OLD_CHAT NEW=$NEW_CHAT"
  exit 0
fi

echo "[fix-migrate] updated env but getChat verify failed:"
echo "$VERIFY" | head -c 400
exit 4
