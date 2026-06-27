#!/bin/bash
# purpleauto.co.kr nginx server_name 반영
set -e

CONF_SRC="/var/www/purple-lease/deploy/nginx-purple-lease.conf"
CONF_DST="/etc/nginx/sites-available/purple-lease"
ENABLED="/etc/nginx/sites-enabled/purple-lease"

if [ ! -f "$CONF_SRC" ]; then
  echo "[nginx-domain] config not found: $CONF_SRC"
  exit 1
fi

cp "$CONF_SRC" "$CONF_DST"
chmod 644 "$CONF_DST"
ln -sf "$CONF_DST" "$ENABLED"

# default 중복 방지: sites-enabled 내 다른 default_server 제거 시도
for f in /etc/nginx/sites-enabled/*; do
  [ "$f" = "$ENABLED" ] && continue
  [ -f "$f" ] || continue
  if grep -q "default_server" "$f" 2>/dev/null && grep -q "/var/www/purple-lease\|152.42.213.222" "$f" 2>/dev/null; then
    sed -i 's/ default_server//g' "$f" 2>/dev/null || true
    echo "[nginx-domain] removed default_server from $f"
  fi
done

nginx -t
systemctl reload nginx
echo "[nginx-domain] OK — server_name: purpleauto.co.kr www.purpleauto.co.kr"
