#!/bin/bash
set -euo pipefail
ENV=/var/www/purple-lease/.env.sync
ROOT=/var/www/purple-lease
echo "=== cron ==="
cat /etc/cron.d/purple-review-gen 2>/dev/null || echo "no_cron"
echo "=== service ==="
systemctl is-active purple-review-gen-api.service || true
echo "=== env ==="
grep -E '^(GEMINI|SUPABASE_URL|REVIEW)' "$ENV" | sed 's/=.*/=***/' || true
echo "=== gemini test ==="
set -a; source "$ENV"; set +a
HTTP=$(curl -s -w "\n%{http_code}" \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"ok"}]}]}')
CODE=$(echo "$HTTP" | tail -n1)
BODY=$(echo "$HTTP" | sed '$d')
echo "gemini_http=$CODE"
echo "$BODY" | head -c 250
echo
echo "=== log tail ==="
tail -20 /var/log/purple-review-gen.log 2>/dev/null || echo "no_log"
echo "=== db ==="
cd "$ROOT"
node -e "const G=require('./js/customer-review-generator'); G.getTodayAiCount().then(n=>console.log('today_ai',n)).catch(e=>console.error('db_err',e.message));"
node -e "const G=require('./js/customer-review-generator'); G.sbFetch('customer_reviews?select=listing_id,title,is_ai_generated,published_at&is_ai_generated=eq.true&order=created_at.desc&limit=5',{method:'GET'}).then(r=>console.log('recent_ai',JSON.stringify(r||[]))).catch(e=>console.error('list_err',e.message));"
