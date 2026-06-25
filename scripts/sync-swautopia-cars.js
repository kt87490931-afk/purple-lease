#!/usr/bin/env node
/**
 * swautopia → Supabase used_cars 동기화 (크론용)
 *
 * 사용법:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-swautopia-cars.js
 *
 * crontab (6시간마다):
 *   0 */6 * * * cd /var/www/purple-lease && /usr/bin/node scripts/sync-swautopia-cars.js >> /var/log/purple-swautopia-sync.log 2>&1
 */
'use strict';

var path = require('path');
var SwautopiaSync = require(path.join(__dirname, '..', 'js', 'swautopia-sync.js'));
var fetch = global.fetch || require('node-fetch');

var SUPABASE_URL = process.env.SUPABASE_URL || '';
var SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[sync] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

async function sbFetch(tablePath, options) {
  var url = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + tablePath;
  var headers = Object.assign({
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal'
  }, (options && options.headers) || {});
  var res = await fetch(url, Object.assign({}, options, { headers: headers }));
  if (!res.ok) {
    var text = await res.text();
    throw new Error('Supabase ' + res.status + ': ' + text);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function main() {
  var started = new Date();
  console.log('[sync] start', started.toISOString());

  var cars = await SwautopiaSync.fetchAllCars();
  var rows = cars.map(function (c) { return SwautopiaSync.mapCarToRow(c); });
  var activeIds = rows.map(function (r) { return r.listing_id; });

  for (var i = 0; i < rows.length; i += 40) {
    var batch = rows.slice(i, i + 40);
    await sbFetch('used_cars?on_conflict=listing_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(batch)
    });
  }

  var existing = await sbFetch('used_cars?sync_source=eq.swautopia&select=listing_id') || [];
  var deactivate = existing.map(function (r) { return r.listing_id; }).filter(function (id) {
    return activeIds.indexOf(id) < 0;
  });

  if (deactivate.length) {
    await sbFetch('used_cars?listing_id=in.(' + deactivate.join(',') + ')', {
      method: 'PATCH',
      body: JSON.stringify({ is_active: false })
    });
  }

  var ms = Date.now() - started.getTime();
  console.log('[sync] ok count=' + rows.length + ' deactivated=' + deactivate.length + ' duration_ms=' + ms);
}

main().catch(function (err) {
  console.error('[sync] fail', err.message || err);
  process.exit(1);
});
