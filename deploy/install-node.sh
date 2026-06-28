#!/bin/bash
# Node.js 20 LTS (swautopia cron용) — 없을 때만 설치
set -euo pipefail

if command -v node >/dev/null 2>&1; then
  echo "[node] already installed: $(node -v)"
  exit 0
fi

export DEBIAN_FRONTEND=noninteractive
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
echo "[node] installed: $(node -v) npm=$(npm -v)"
