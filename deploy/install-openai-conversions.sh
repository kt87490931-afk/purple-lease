#!/bin/bash
set -euo pipefail
ROOT=/var/www/purple-lease
ENV_FILE=/etc/purpleauto/openai-conversions.env
if [ -n "${OPENAI_CONVERSIONS_API_KEY:-}" ]; then
  install -d -m 700 /etc/purpleauto
  umask 077
  printf 'OPENAI_CONVERSIONS_API_KEY=%s\n' "$OPENAI_CONVERSIONS_API_KEY" > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi
if [ ! -s "$ENV_FILE" ]; then
  echo '[openai-conversions] no server key configured; worker not installed'
  exit 0
fi
install -d -m 700 -o www-data -g www-data /var/lib/purple-openai-conversions
cat > /etc/systemd/system/purple-openai-conversions.service <<EOF
[Unit]
Description=PurpleAuto confirmed lead conversion delivery
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$ROOT
EnvironmentFile=$ROOT/.env.sync
EnvironmentFile=$ENV_FILE
ExecStartPre=$(command -v node) $ROOT/scripts/openai-conversions-worker.js --check
ExecStart=$(command -v node) $ROOT/scripts/openai-conversions-worker.js
Restart=on-failure
RestartSec=30
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/lib/purple-openai-conversions
UMask=0077

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable purple-openai-conversions.service
systemctl restart purple-openai-conversions.service
systemctl is-active --quiet purple-openai-conversions.service
journalctl -u purple-openai-conversions.service -n 5 --no-pager -o cat
echo '[openai-conversions] service running; awaiting new confirmed consultations'
