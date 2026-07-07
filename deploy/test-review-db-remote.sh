#!/bin/bash
set -a
source /var/www/purple-lease/.env.sync
set +a
cd /var/www/purple-lease
node -e "const G=require('./js/customer-review-generator'); G.getTodayAiCount().then(function(n){console.log('today_ai_count',n); process.exit(0);}).catch(function(e){console.error('db_error',e.message); process.exit(1);});"
