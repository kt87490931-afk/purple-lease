#!/bin/bash
# swautopia 프록시 nginx 스니펫 설치 (배포 시)
set -e

SNIPPET_SRC="/var/www/purple-lease/deploy/nginx-swautopia-proxy-snippet.conf"
SNIPPET_DST="/etc/nginx/snippets/purple-swautopia-proxy.conf"
MARKER="purple-swautopia-proxy"

if [ ! -f "$SNIPPET_SRC" ]; then
  echo "[swautopia-proxy] snippet not found: $SNIPPET_SRC"
  exit 0
fi

mkdir -p /etc/nginx/snippets
cp "$SNIPPET_SRC" "$SNIPPET_DST"
chmod 644 "$SNIPPET_DST"

FOUND=""
for SITE in /etc/nginx/sites-enabled/*; do
  [ -f "$SITE" ] || continue
  if grep -q "/var/www/purple-lease\|purpleauto.co.kr" "$SITE" 2>/dev/null; then
    FOUND="$SITE"
    break
  fi
done

if [ -z "$FOUND" ]; then
  echo "[swautopia-proxy] nginx site config not found — skip include"
  exit 0
fi

if grep -q "$MARKER" "$FOUND" 2>/dev/null; then
  echo "[swautopia-proxy] already configured in $FOUND"
elif grep -q "purple-ks-proxy" "$FOUND" 2>/dev/null; then
  sed -i "/purple-ks-proxy/a \\    include snippets/purple-swautopia-proxy.conf; # $MARKER" "$FOUND"
  echo "[swautopia-proxy] include added after ks-proxy in $FOUND"
else
  sed -i "/server_name/i \\    include snippets/purple-swautopia-proxy.conf; # $MARKER" "$FOUND"
  echo "[swautopia-proxy] include added to $FOUND"
fi

nginx -t
systemctl reload nginx
echo "[swautopia-proxy] nginx reloaded OK"
