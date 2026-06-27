#!/bin/bash
# Storage(seo/sitemap.xml) → 서버 /var/www/purple-lease/sitemap.xml 동기화
set -euo pipefail

DEST="/var/www/purple-lease/sitemap.xml"
SRC="https://zliclwgiaqvilnnookyi.supabase.co/storage/v1/object/public/purple-uploads/seo/sitemap.xml"
TMP="${DEST}.tmp"

if curl -sf "$SRC" -o "$TMP"; then
  mv "$TMP" "$DEST"
  chmod 644 "$DEST"
  chown www-data:www-data "$DEST"
  echo "[sync-sitemap] OK $(wc -c < "$DEST") bytes"
else
  rm -f "$TMP"
  echo "[sync-sitemap] skip — storage file not found"
  exit 0
fi
