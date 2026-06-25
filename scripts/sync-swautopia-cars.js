#!/usr/bin/env node
/**
 * swautopia → Supabase used_cars 동기화 (크론용)
 *
 * 사용법:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-swautopia-cars.js
 *
 * crontab (6시간마다):
 *   0 */6 * * * cd /var/www/purple-lease && /usr/bin/node scripts/sync-swautopia-cars.js >> /var/log/purple-swautopia-sync.log 2>&1
 *
 * 참고: 차량 사진 4:3 리사이즈는 어드민 「수동파싱 (swautopia)」에서 Supabase Storage로 업로드됩니다.
 * 크론은 매물 메타·상태만 갱신하며, 이미 Storage에 있는 사진 URL은 DB에 그대로 유지됩니다.
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

function isPurpleStoredCarPhoto(url) {
  return String(url || '').indexOf('/purple-uploads/usedcars/') >= 0;
}

function isAdminHiddenCar(row) {
  return !!(row && row.detail_json && row.detail_json.admin_hidden);
}

async function main() {
  var started = new Date();
  console.log('[sync] start', started.toISOString());

  var cars = await SwautopiaSync.fetchAllCars();
  var rows = cars.map(function (c) { return SwautopiaSync.mapCarToRow(c); });

  var existingRows = await sbFetch('used_cars?sync_source=eq.swautopia&select=listing_id,thumb_url,detail_json,photo_count,is_active') || [];
  var existingMap = {};
  var hiddenIds = {};
  existingRows.forEach(function (r) {
    existingMap[r.listing_id] = r;
    if (isAdminHiddenCar(r)) hiddenIds[r.listing_id] = true;
  });

  rows = rows.filter(function (r) { return !hiddenIds[r.listing_id]; });
  var activeIds = rows.map(function (r) { return r.listing_id; });

  rows.forEach(function (row) {
    var prev = existingMap[row.listing_id];
    var prevPhotos = (prev && prev.detail_json && prev.detail_json.photos) || [];
    if (prevPhotos.length && prevPhotos.every(isPurpleStoredCarPhoto)) {
      row.detail_json.photos = prevPhotos;
      row.thumb_url = isPurpleStoredCarPhoto(prev.thumb_url) ? prev.thumb_url : prevPhotos[0];
      row.photo_count = prevPhotos.length;
    }
  });

  for (var i = 0; i < rows.length; i += 40) {
    var batch = rows.slice(i, i + 40);
    await sbFetch('used_cars?on_conflict=listing_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(batch)
    });
  }

  var deactivate = existingRows.map(function (r) { return r.listing_id; }).filter(function (id) {
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
