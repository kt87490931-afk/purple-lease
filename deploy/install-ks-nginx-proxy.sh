#!/bin/bash
# KS 프록시 nginx 스니펫 설치 (배포 시 1회·갱신)
set -e

SNIPPET_SRC="/var/www/purple-lease/deploy/nginx-ks-proxy-snippet.conf"
SNIPPET_DST="/etc/nginx/snippets/purple-ks-proxy.conf"
MARKER="purple-ks-proxy"

if [ ! -f "$SNIPPET_SRC" ]; then
  echo "[ks-proxy] snippet not found: $SNIPPET_SRC"
  exit 0
fi

mkdir -p /etc/nginx/snippets
cp "$SNIPPET_SRC" "$SNIPPET_DST"
chmod 644 "$SNIPPET_DST"

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

if [ -z "$FOUND" ]; then
  echo "[ks-proxy] nginx site config not found — skip"
  exit 0
fi

if grep -q "$MARKER" "$FOUND" 2>/dev/null; then
  echo "[ks-proxy] already configured in $FOUND"
else
  sed -i "/server_name/i \\    # $MARKER\\n    include snippets/purple-ks-proxy.conf;" "$FOUND"
  echo "[ks-proxy] include added to $FOUND"
fi

nginx -t
systemctl reload nginx
echo "[ks-proxy] nginx reloaded OK"
