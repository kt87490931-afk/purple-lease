#!/bin/bash
# 텔레그램 견적알림 원클릭 설정 (chat_id 찾기 + 서버 등록)
# 사용: bash deploy/setup-telegram-easy.sh 'BOT_TOKEN'
set -euo pipefail

TOKEN="${1:-}"
ROOT="/var/www/purple-lease"

if [ -z "$TOKEN" ]; then
  echo "사용법: bash deploy/setup-telegram-easy.sh '봇토큰'"
  exit 1
fi

echo ""
echo "📱 먼저 텔레그램 그룹「퍼플오토의 역습」에서"
echo "   「안녕」 또는 「/start」 메시지를 보내주세요."
echo ""
read -r -p "보내셨으면 Enter 키를 누르세요… " _

CHAT_ID=""
TRIES=0
while [ -z "$CHAT_ID" ] && [ "$TRIES" -lt 3 ]; do
  TRIES=$((TRIES + 1))
  OUT=$(bash "$ROOT/deploy/get-telegram-chat-id.sh" "$TOKEN" 2>&1) || true
  echo "$OUT"
  CHAT_ID=$(echo "$OUT" | grep -oE 'chat_id: -?[0-9]+' | head -1 | awk '{print $2}' || true)
  if [ -z "$CHAT_ID" ]; then
    echo ""
    echo "다시 그룹에서 메시지 보낸 뒤 Enter…"
    read -r _
  fi
done

if [ -z "$CHAT_ID" ]; then
  echo "chat_id를 찾지 못했습니다. BotFather → Allow Groups? Enable 확인 후 재시도."
  exit 1
fi

echo ""
echo "chat_id=$CHAT_ID 로 서버 설정 중…"
bash "$ROOT/deploy/update-telegram-config.sh" "$TOKEN" "$CHAT_ID"

echo ""
echo "=========================================="
echo " ✅ 설정 완료!"
echo " 텔레그램 그룹에서 /테스트 입력해 보세요"
echo "=========================================="
