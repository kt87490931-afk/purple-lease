#!/usr/bin/env node
/**
 * swautopia → Supabase used_cars 전체 동기화 (서버 cron · CLI)
 * 수동파싱(어드민)과 동일: 매물 메타 + 사진 Storage + 판매완료 비활성
 *
 * 사용법:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-swautopia-cars.js
 *   node scripts/sync-swautopia-cars.js --mode=auto
 *
 * cron (KST 04:00): deploy/install-swautopia-cron.sh 참고
 */
'use strict';

var path = require('path');
var SwautopiaSync = require(path.join(__dirname, '..', 'js', 'swautopia-sync.js'));
var fetch = global.fetch || require('node-fetch');
var sharp = require('sharp');

var SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
var SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

var SYNC_MODE = 'auto';
var TEST_LISTING_ID = null;
process.argv.slice(2).forEach(function (arg) {
  if (arg.indexOf('--mode=') === 0) SYNC_MODE = arg.slice(7) || 'auto';
  if (arg.indexOf('--listing-id=') === 0) TEST_LISTING_ID = parseInt(arg.slice(13), 10) || null;
  if (arg === '--test') SYNC_MODE = 'test';
});

var SIZES = { THUMB: { w: 800, h: 600 }, GALLERY: { w: 1280, h: 960 } };
var MAX_PHOTOS_PER_CAR = 20;
var SWAUTOPIA_BASE = 'https://swautopia.co.kr';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[sync] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

function storagePublicUrl(storagePath) {
  return SUPABASE_URL + '/storage/v1/object/public/purple-uploads/' + String(storagePath).replace(/^\//, '');
}

function isPurpleStoredCarPhoto(url) {
  return String(url || '').indexOf('/purple-uploads/usedcars/') >= 0;
}

function isAdminHiddenCar(row) {
  return !!(row && row.detail_json && row.detail_json.admin_hidden);
}

function absSwautopiaUrl(url) {
  if (!url) return '';
  var s = String(url).trim();
  if (/^https?:\/\//i.test(s)) return s;
  return SWAUTOPIA_BASE + (s.indexOf('/') === 0 ? s : '/' + s);
}

async function sbFetch(tablePath, options) {
  var url = SUPABASE_URL + '/rest/v1/' + tablePath;
  var headers = Object.assign({
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json'
  }, (options && options.headers) || {});
  var res = await fetch(url, Object.assign({}, options, { headers: headers }));
  var text = await res.text();
  if (!res.ok) {
    throw new Error('Supabase ' + res.status + ': ' + text.slice(0, 300));
  }
  if (res.status === 204 || !text || !String(text).trim()) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error('Supabase JSON parse: ' + (e.message || e));
  }
}

async function sbInsertLog(row) {
  var res = await sbFetch('used_car_sync_logs', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([row])
  });
  return res && res[0] ? res[0].id : null;
}

async function sbUpdateLog(logId, patch) {
  await sbFetch('used_car_sync_logs?id=eq.' + logId, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(patch)
  });
}

async function fetchImageBuffer(url) {
  var res = await fetch(absSwautopiaUrl(url), {
    headers: {
      Referer: SWAUTOPIA_BASE + '/',
      'User-Agent': 'Mozilla/5.0 (compatible; PurpleLeaseSync/2.0)'
    }
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return Buffer.from(await res.arrayBuffer());
}

async function resizeCover(buffer, w, h) {
  return sharp(buffer)
    .resize(w, h, { fit: 'cover', position: 'centre', background: { r: 244, g: 242, b: 250 } })
    .jpeg({ quality: 88 })
    .toBuffer();
}

async function uploadStorage(storagePath, buffer) {
  var p = String(storagePath).replace(/^\//, '');
  var url = SUPABASE_URL + '/storage/v1/object/purple-uploads/' + p;
  var res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
      'Cache-Control': '86400'
    },
    body: buffer
  });
  if (!res.ok) {
    var text = await res.text();
    throw new Error('Storage ' + res.status + ': ' + text.slice(0, 200));
  }
  return storagePublicUrl(p);
}

async function processRowPhotos(row, stats) {
  var photos = (row.detail_json && row.detail_json.photos) || [];
  if (!photos.length) return row;

  var listingId = row.listing_id;
  var limited = photos.slice(0, MAX_PHOTOS_PER_CAR);
  var out = [];

  if (limited.every(isPurpleStoredCarPhoto)) {
    row.detail_json.photos = limited;
    row.thumb_url = isPurpleStoredCarPhoto(row.thumb_url) ? row.thumb_url : limited[0];
    row.photo_count = limited.length;
    stats.photosSkipped = (stats.photosSkipped || 0) + limited.length;
    return row;
  }

  for (var i = 0; i < limited.length; i++) {
    var src = limited[i];
    if (isPurpleStoredCarPhoto(src)) {
      out.push(src);
      if (i === 0) row.thumb_url = src;
      stats.photosSkipped = (stats.photosSkipped || 0) + 1;
      continue;
    }
    try {
      var buf = await fetchImageBuffer(src);
      if (i === 0) {
        var galleryBuf = await resizeCover(buf, SIZES.GALLERY.w, SIZES.GALLERY.h);
        var thumbBuf = await resizeCover(buf, SIZES.THUMB.w, SIZES.THUMB.h);
        var galleryUrl = await uploadStorage('usedcars/' + listingId + '/0.jpg', galleryBuf);
        var thumbUrl = await uploadStorage('usedcars/' + listingId + '/thumb.jpg', thumbBuf);
        out.push(galleryUrl);
        row.thumb_url = thumbUrl;
        stats.photosUploaded = (stats.photosUploaded || 0) + 2;
      } else {
        var resized = await resizeCover(buf, SIZES.GALLERY.w, SIZES.GALLERY.h);
        var photoUrl = await uploadStorage('usedcars/' + listingId + '/' + i + '.jpg', resized);
        out.push(photoUrl);
        stats.photosUploaded = (stats.photosUploaded || 0) + 1;
        if (i === 0 && !row.thumb_url) row.thumb_url = photoUrl;
      }
    } catch (e) {
      console.warn('[sync] photo skip listing=' + listingId + ' i=' + i + ' ' + (e.message || e));
      out.push(src);
      stats.photosFailed = (stats.photosFailed || 0) + 1;
      if (i === 0 && !row.thumb_url) row.thumb_url = src;
    }
  }

  row.detail_json.photos = out;
  row.thumb_url = row.thumb_url || out[0] || '';
  row.photo_count = out.length;
  return row;
}

function rowNeedsPhotoUpload(row) {
  var photos = (row.detail_json && row.detail_json.photos) || [];
  return photos.length > 0 && !photos.every(isPurpleStoredCarPhoto);
}

function rowHasStorageThumb(row) {
  return isPurpleStoredCarPhoto(row.thumb_url);
}

function tallyCarPhotoSync(row, tally) {
  var photos = (row.detail_json && row.detail_json.photos) || [];
  if (!photos.length) {
    tally.carsPhotoOk = (tally.carsPhotoOk || 0) + 1;
    return;
  }
  if (rowHasStorageThumb(row)) {
    tally.carsPhotoOk = (tally.carsPhotoOk || 0) + 1;
  } else {
    tally.carsPhotoFail = (tally.carsPhotoFail || 0) + 1;
    if (!tally.failedListingIds) tally.failedListingIds = [];
    tally.failedListingIds.push(row.listing_id);
  }
}

async function main() {
  var started = Date.now();
  var startedAt = new Date(started).toISOString();
  var logId = null;
  var diag = { phase: 'init', sync_mode: SYNC_MODE };

  console.log('[sync] start mode=' + SYNC_MODE + ' at ' + startedAt);

  try {
    logId = await sbInsertLog({
      source: 'swautopia',
      sync_mode: SYNC_MODE,
      ok: false,
      msg: '진행 중',
      diag: diag,
      started_at: startedAt
    });
  } catch (e) {
    console.warn('[sync] log insert skipped:', e.message || e);
  }

  try {
    var cars = await SwautopiaSync.fetchAllCars();
    diag.phase = 'fetch';
    diag.cars_fetched = cars.length;

    var rows = cars.map(function (c) { return SwautopiaSync.mapCarToRow(c); });
    var existingRows = await sbFetch('used_cars?sync_source=eq.swautopia&select=listing_id,thumb_url,detail_json,photo_count,is_active') || [];
    var existingMap = {};
    var hiddenIds = {};

    existingRows.forEach(function (r) {
      existingMap[r.listing_id] = r;
      if (isAdminHiddenCar(r)) hiddenIds[r.listing_id] = true;
    });

    rows = rows.filter(function (r) { return !hiddenIds[r.listing_id]; });
    if (TEST_LISTING_ID) {
      rows = rows.filter(function (r) { return r.listing_id === TEST_LISTING_ID; });
      if (!rows.length) throw new Error('listing_id ' + TEST_LISTING_ID + ' not found in swautopia feed');
    }
    var activeIds = rows.map(function (r) { return r.listing_id; });
    diag.cars_to_sync = rows.length;

    var stats = { photosUploaded: 0, photosFailed: 0, photosSkipped: 0 };
    var carPhotoTally = { carsPhotoOk: 0, carsPhotoFail: 0, failedListingIds: [] };
    diag.phase = 'photos';

    for (var c = 0; c < rows.length; c++) {
      if ((c + 1) % 10 === 0 || c === 0) {
        console.log('[sync] photos car ' + (c + 1) + '/' + rows.length + ' id=' + rows[c].listing_id);
      }
      var prev = existingMap[rows[c].listing_id];
      var prevPhotos = (prev && prev.detail_json && prev.detail_json.photos) || [];
      if (prevPhotos.length && prevPhotos.every(isPurpleStoredCarPhoto)) {
        rows[c].detail_json.photos = prevPhotos;
        rows[c].thumb_url = isPurpleStoredCarPhoto(prev.thumb_url) ? prev.thumb_url : prevPhotos[0];
        rows[c].photo_count = prevPhotos.length;
        stats.photosSkipped += prevPhotos.length;
      } else {
        rows[c] = await processRowPhotos(rows[c], stats);
      }
      tallyCarPhotoSync(rows[c], carPhotoTally);
    }

    diag.photos_uploaded = stats.photosUploaded;
    diag.photos_failed = stats.photosFailed;
    diag.photos_skipped = stats.photosSkipped;
    diag.cars_photo_ok = carPhotoTally.carsPhotoOk;
    diag.cars_photo_fail = carPhotoTally.carsPhotoFail;
    diag.failed_listing_ids = carPhotoTally.failedListingIds || [];

    diag.phase = 'save';
    for (var i = 0; i < rows.length; i += 40) {
      var batch = rows.slice(i, i + 40);
      await sbFetch('used_cars?on_conflict=listing_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(batch)
      });
    }

    var deactivate = [];
    if (!TEST_LISTING_ID && SYNC_MODE !== 'test') {
      deactivate = existingRows.map(function (r) { return r.listing_id; }).filter(function (id) {
        return activeIds.indexOf(id) < 0;
      });
    }

    if (deactivate.length) {
      await sbFetch('used_cars?listing_id=in.(' + deactivate.join(',') + ')', {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ is_active: false })
      });
    }

    var needsPhotos = rows.some(rowNeedsPhotoUpload);
    var ok = true;
    var msg = '완료';
    if (needsPhotos && stats.photosUploaded === 0 && stats.photosSkipped === 0) {
      ok = false;
      msg = '사진 Storage 업로드 0장';
    } else if (stats.photosFailed > 0 && stats.photosUploaded === 0) {
      ok = false;
      msg = '사진 업로드 전부 실패';
    } else if (carPhotoTally.carsPhotoFail > 0) {
      msg = '완료 — 사진 OK ' + carPhotoTally.carsPhotoOk + ' / 실패 ' + carPhotoTally.carsPhotoFail;
    }

    var durationMs = Date.now() - started;
    console.log('[sync] ' + (ok ? 'ok' : 'fail') + ' count=' + rows.length + ' deactivated=' + deactivate.length +
      ' storage=' + stats.photosUploaded + ' failed=' + stats.photosFailed + ' duration_ms=' + durationMs);

    if (logId) {
      await sbUpdateLog(logId, {
        ok: ok,
        msg: msg,
        diag: diag,
        cars_upserted: rows.length,
        cars_deactivated: deactivate.length,
        photos_processed: stats.photosUploaded,
        duration_ms: durationMs,
        ended_at: new Date().toISOString()
      });
    }
    if (!ok) process.exit(1);
  } catch (err) {
    var errMsg = err.message || String(err);
    console.error('[sync] fail', errMsg);
    var failMs = Date.now() - started;
    if (logId) {
      await sbUpdateLog(logId, {
        ok: false,
        msg: errMsg,
        diag: Object.assign({}, diag, { error: errMsg }),
        duration_ms: failMs,
        ended_at: new Date().toISOString()
      });
    } else {
      try {
        await sbInsertLog({
          source: 'swautopia',
          sync_mode: SYNC_MODE,
          ok: false,
          msg: errMsg,
          diag: Object.assign({}, diag, { error: errMsg }),
          duration_ms: failMs,
          started_at: startedAt,
          ended_at: new Date().toISOString()
        });
      } catch (_) { /* ignore */ }
    }
    process.exit(1);
  }
}

main();
