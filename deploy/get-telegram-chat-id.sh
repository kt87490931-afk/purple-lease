#!/bin/bash
# 텔레그램 그룹 chat_id 쉽게 찾기
# 사용: bash deploy/get-telegram-chat-id.sh 'BOT_TOKEN'
set -euo pipefail

TOKEN="${1:-}"
if [ -z "$TOKEN" ]; then
  echo "사용법: bash deploy/get-telegram-chat-id.sh '봇토큰'"
  exit 1
fi

echo "=========================================="
echo " 1) 텔레그램 그룹에서 메시지 1번 보내세요"
echo "    예: 안녕  또는  /start"
echo "    (그룹: 퍼플오토의 역습, 봇이 들어가 있어야 함)"
echo "=========================================="
echo ""
echo "잠시만요… 웹훅을 잠깐 끄고 chat_id를 조회합니다."

# 웹훅이 켜져 있으면 getUpdates 가 항상 빈 배열 [] 로 나옵니다
curl -sS "https://api.telegram.org/bot${TOKEN}/deleteWebhook?drop_pending_updates=false" >/dev/null || true
sleep 1

RAW=$(curl -sS "https://api.telegram.org/bot${TOKEN}/getUpdates?limit=20&timeout=3")

node -e "
var raw = process.argv[1];
var data;
try { data = JSON.parse(raw); } catch (e) {
  console.log('API 응답 파싱 실패');
  console.log(raw);
  process.exit(1);
}
if (!data.ok) {
  console.log('봇 토큰 오류:', data.description || raw);
  process.exit(2);
}
var chats = {};
(data.result || []).forEach(function (u) {
  var m = u.message || u.edited_message || u.my_chat_member || u.chat_member;
  if (!m || !m.chat) return;
  var c = m.chat;
  chats[c.id] = { id: c.id, title: c.title || c.first_name || c.username || '(이름없음)', type: c.type };
});
var list = Object.values(chats);
if (!list.length) {
  console.log('');
  console.log('❌ chat_id를 찾지 못했습니다.');
  console.log('');
  console.log('다시 시도:');
  console.log('  1. 텔레그램 그룹에서 \"안녕\" 또는 \"/start\" 메시지 전송');
  console.log('  2. 이 스크립트 다시 실행');
  console.log('');
  console.log('(봇이 그룹에 추가되어 있는지, Allow Groups? 가 Enable 인지 확인)');
  process.exit(3);
}
console.log('');
console.log('✅ 찾은 채팅 목록:');
console.log('');
list.forEach(function (c, i) {
  console.log('  [' + (i + 1) + '] ' + c.title);
  console.log('      chat_id: ' + c.id);
  console.log('      type: ' + c.type);
  console.log('');
});
if (list.length === 1) {
  console.log('다음 명령을 복사해서 실행하세요:');
  console.log('');
  console.log(\"bash /var/www/purple-lease/deploy/update-telegram-config.sh '\" + process.argv[2] + \"' '\" + list[0].id + \"'\");
  console.log('');
}
" "$RAW" "$TOKEN"
