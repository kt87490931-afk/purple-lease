#!/bin/bash
# 견적문의 텔레그램 웹훅 API (Node systemd + nginx)
set -euo pipefail

ROOT="/var/www/purple-lease"
API_SCRIPT="$ROOT/scripts/inquiry-telegram-webhook.js"
SNIPPET_SRC="$ROOT/deploy/nginx-inquiry-telegram-snippet.conf"
SNIPPET_DST="/etc/nginx/snippets/purple-inquiry-telegram.conf"
UNIT="/etc/systemd/system/purple-inquiry-telegram.service"
MARKER="purple-inquiry-telegram"

if [ ! -f "$API_SCRIPT" ]; then
  echo "[inquiry-telegram] missing $API_SCRIPT"
  exit 1
fi

chmod +x "$API_SCRIPT"

cat > "$UNIT" << EOF
[Unit]
Description=Purple Auto Inquiry Telegram Webhook
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$ROOT
EnvironmentFile=$ROOT/.env.sync
ExecStart=$(command -v node) $API_SCRIPT
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable purple-inquiry-telegram.service
systemctl restart purple-inquiry-telegram.service

if [ -f "$SNIPPET_SRC" ]; then
  mkdir -p /etc/nginx/snippets
  cp "$SNIPPET_SRC" "$SNIPPET_DST"
  chmod 644 "$SNIPPET_DST"
fi

FOUND=""
for SITE in /etc/nginx/sites-enabled/*; do
  [ -f "$SITE" ] || continue
  if grep -q "/var/www/purple-lease" "$SITE" 2>/dev/null; then
    FOUND="$SITE"
    break
  fi
done

if [ -z "$FOUND" ]; then
  for SITE in /etc/nginx/sites-enabled/*; do
    [ -f "$SITE" ] || continue
    if grep -qE "listen\s+80" "$SITE" 2>/dev/null; then
      FOUND="$SITE"
      break
    fi
  done
fi

if [ -n "$FOUND" ] && [ -f "$SNIPPET_DST" ]; then
  if grep -q "$MARKER" "$FOUND" 2>/dev/null; then
    echo "[inquiry-telegram] nginx already configured in $FOUND"
  else
    sed -i "/server_name/i \\    # $MARKER\\n    include snippets/purple-inquiry-telegram.conf;" "$FOUND"
    echo "[inquiry-telegram] nginx include added to $FOUND"
  fi
  nginx -t
  systemctl reload nginx
fi

systemctl is-active purple-inquiry-telegram.service && echo "[inquiry-telegram] OK — service running"
