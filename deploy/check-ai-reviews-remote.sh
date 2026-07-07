#!/bin/bash
set -a; source /var/www/purple-lease/.env.sync; set +a
cd /var/www/purple-lease
node -e "const G=require('./js/customer-review-generator'); G.sbFetch('customer_reviews?select=listing_id,title,is_ai_generated,published_at&is_ai_generated=eq.true&order=listing_id.desc&limit=3',{method:'GET'}).then(function(r){console.log(JSON.stringify(r,null,2));}).catch(function(e){console.error(e.message);});"
