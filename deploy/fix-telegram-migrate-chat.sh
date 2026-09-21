#!/bin/bash
# 그룹→슈퍼그룹 승격 시 chat_id 자동 갱신
# getChat은 구 chat_id에도 ok를 줄 수 있어, sendChatAction으로 migrate 감지 (채팅에 메시지 미표시)
set -euo pipefail

ENV="/var/www/purple-lease/.env.sync"
ROOT="/var/www/purple-lease"
CHAT_FILE="$ROOT/.telegram-chat-id"

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
if [ -f "$CHAT_FILE" ]; then
  OVERRIDE=$(tr -d ' \t\r\n' < "$CHAT_FILE" || true)
  if [ -n "$OVERRIDE" ]; then
    OLD_CHAT="$OVERRIDE"
  fi
fi
echo "[fix-migrate] current chat_id=$OLD_CHAT"

detect_migrate() {
  local chat="$1"
  local resp
  # 채팅에 메시지가 안 뜨는 typing 액션으로 migrate_to_chat_id 감지
  resp=$(curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction" \
    -H 'Content-Type: application/json' \
    -d "{\"chat_id\":${chat},\"action\":\"typing\"}")
  echo "$resp" | node -e "
var d='';
process.stdin.on('data',function(c){d+=c});
process.stdin.on('end',function(){
  try {
    var j=JSON.parse(d);
    if (j.ok) process.exit(0);
    var p=j.parameters||{};
    if (p.migrate_to_chat_id != null) {
      console.log(String(p.migrate_to_chat_id));
      process.exit(10);
    }
  } catch(e) {}
  process.exit(1);
});
"
}

NEW_CHAT=""
set +e
MIGRATE_OUT=$(detect_migrate "$OLD_CHAT")
MIGRATE_RC=$?
set -e

if [ "$MIGRATE_RC" -eq 0 ]; then
  echo "[fix-migrate] chat_id still valid — no migration needed"
  # 사이드카·env 동기화
  printf '%s\n' "$OLD_CHAT" > "$CHAT_FILE"
  chown www-data:www-data "$CHAT_FILE" 2>/dev/null || true
  chmod 644 "$CHAT_FILE" 2>/dev/null || true
  exit 0
fi

if [ "$MIGRATE_RC" -eq 10 ] && [ -n "$MIGRATE_OUT" ]; then
  NEW_CHAT="$MIGRATE_OUT"
else
  # fallback: getChat 오류 파라미터
  RESP=$(curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChat?chat_id=${OLD_CHAT}")
  NEW_CHAT=$(echo "$RESP" | node -e "
var d='';
process.stdin.on('data',function(c){d+=c});
process.stdin.on('end',function(){
  try {
    var j=JSON.parse(d);
    var p=j.parameters||{};
    if(p.migrate_to_chat_id!=null) console.log(String(p.migrate_to_chat_id));
  } catch(e) {}
});
")
fi

if [ -z "$NEW_CHAT" ]; then
  echo "[fix-migrate] could not detect migrate_to_chat_id"
  echo "힌트: 그룹에서 /테스트 보낸 뒤 get-telegram-chat-id.sh 로 새 chat_id 확인"
  exit 3
fi

echo "[fix-migrate] migrate_to_chat_id=$NEW_CHAT"

if grep -q '^TELEGRAM_CHAT_ID=' "$ENV"; then
  sed -i "s|^TELEGRAM_CHAT_ID=.*|TELEGRAM_CHAT_ID=${NEW_CHAT}|" "$ENV"
else
  echo "TELEGRAM_CHAT_ID=${NEW_CHAT}" >> "$ENV"
fi

printf '%s\n' "$NEW_CHAT" > "$CHAT_FILE"
chown www-data:www-data "$CHAT_FILE" 2>/dev/null || true
chmod 644 "$CHAT_FILE" 2>/dev/null || true

chmod 600 "$ENV"
systemctl restart purple-inquiry-telegram.service 2>/dev/null || true

if [ -f "$ROOT/deploy/register-telegram-bot-webhook.sh" ]; then
  bash "$ROOT/deploy/register-telegram-bot-webhook.sh" 2>&1 || true
fi

VERIFY=$(curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction" \
  -H 'Content-Type: application/json' \
  -d "{\"chat_id\":${NEW_CHAT},\"action\":\"typing\"}")

if echo "$VERIFY" | grep -q '"ok":true'; then
  echo "[fix-migrate] OK — chat_id updated (no Telegram notification sent)"
  echo "OLD=$OLD_CHAT NEW=$NEW_CHAT"
  exit 0
fi

echo "[fix-migrate] updated env but verify failed:"
echo "$VERIFY" | head -c 400
exit 4
