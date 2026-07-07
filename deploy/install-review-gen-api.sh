#!/bin/bash
# AI 후기 즉시 생성 API (Node systemd + nginx)
set -euo pipefail

ROOT="/var/www/purple-lease"
API_SCRIPT="$ROOT/scripts/admin-review-gen-api.js"
SNIPPET_SRC="$ROOT/deploy/nginx-review-gen-api-snippet.conf"
SNIPPET_DST="/etc/nginx/snippets/purple-review-gen-api.conf"
UNIT="/etc/systemd/system/purple-review-gen-api.service"
MARKER="purple-review-gen-api"

if [ ! -f "$API_SCRIPT" ]; then
  echo "[review-gen-api] missing $API_SCRIPT"
  exit 1
fi

chmod +x "$API_SCRIPT"

cat > "$UNIT" << EOF
[Unit]
Description=Purple Auto Admin Review Generation API
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
systemctl enable purple-review-gen-api.service
systemctl restart purple-review-gen-api.service

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
    echo "[review-gen-api] nginx already configured in $FOUND"
  else
    sed -i "/server_name/i \\    # $MARKER\\n    include snippets/purple-review-gen-api.conf;" "$FOUND"
    echo "[review-gen-api] nginx include added to $FOUND"
  fi
  nginx -t
  systemctl reload nginx
fi

systemctl is-active purple-review-gen-api.service && echo "[review-gen-api] OK — service running"
