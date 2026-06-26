#!/usr/bin/env node
/**
 * KS 모델 대표 이미지 → assets/vehicles/m-{ks_model_id}.png 저장
 * DB img_url은 /assets/vehicles/m-{id}.png 경로만 사용 (KS URL 저장 안 함)
 *
 * 사용법:
 *   node scripts/fetch-vehicle-images.js
 *   node scripts/fetch-vehicle-images.js --skip-existing
 *   node scripts/fetch-vehicle-images.js --country=domestic --brands=303
 */
'use strict';

var fs = require('fs');
var path = require('path');
var Ks = require(path.join(__dirname, '..', 'js', 'ks-lease-sync.js'));

var fetchFn = global.fetch || require('node-fetch');
var outDir = path.join(__dirname, '..', 'assets', 'vehicles');
var skipExisting = process.argv.indexOf('--skip-existing') >= 0;
var countryArg = (process.argv.find(function (a) { return a.indexOf('--country=') === 0; }) || '').slice(10);
var brandsArg = (process.argv.find(function (a) { return a.indexOf('--brands=') === 0; }) || '').slice(9);
var brandFilter = brandsArg ? brandsArg.split(',').map(function (s) { return parseInt(s.trim(), 10); }).filter(Boolean) : [];

function sleep(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}

function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return Object.keys(data).map(function (k) { return data[k]; });
}

async function fetchBrands(http, country) {
  var json = await http.postAjax('country', 'search[where][country]=' + encodeURIComponent(country === 'import' ? 'imported' : 'domestic'));
  return normalizeList(json.data).filter(function (b) { return b && b.idx; });
}

async function fetchModels(http, brandId) {
  var json = await http.postAjax('brand', 'input[brand]=' + encodeURIComponent(String(brandId)));
  return normalizeList(json.data).filter(function (m) { return m && m.idx; });
}

async function downloadImage(url, dest) {
  var res = await fetchFn(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  var buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new Error('file too small');
  fs.writeFileSync(dest, buf);
  return buf.length;
}

async function runCountry(http, country) {
  var brands = await fetchBrands(http, country);
  if (brandFilter.length) {
    brands = brands.filter(function (b) { return brandFilter.indexOf(parseInt(b.idx, 10)) >= 0; });
  }
  var ok = 0;
  var skip = 0;
  var fail = 0;
  for (var bi = 0; bi < brands.length; bi++) {
    var brand = brands[bi];
    var models = await fetchModels(http, brand.idx);
    console.log('[brand]', brand.name, models.length + ' models');
    for (var mi = 0; mi < models.length; mi++) {
      var model = models[mi];
      var ksId = parseInt(model.idx, 10);
      var dest = path.join(outDir, 'm-' + ksId + '.png');
      if (skipExisting && fs.existsSync(dest) && fs.statSync(dest).size > 500) {
        skip++;
        continue;
      }
      var url = Ks.pickModelImageKsUrl(model);
      if (!url) {
        console.warn('[skip-no-img]', brand.name, model.name, ksId);
        fail++;
        continue;
      }
      try {
        var bytes = await downloadImage(url, dest);
        console.log('[ok]', brand.name, model.name, 'm-' + ksId + '.png', bytes + 'b');
        ok++;
      } catch (err) {
        console.warn('[fail]', brand.name, model.name, url, err.message || err);
        fail++;
      }
      await sleep(80);
    }
  }
  return { ok: ok, skip: skip, fail: fail };
}

async function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  var http = Ks.createHttp();
  await http.warmSession();
  var countries = countryArg ? [countryArg] : ['domestic', 'import'];
  var total = { ok: 0, skip: 0, fail: 0 };
  for (var i = 0; i < countries.length; i++) {
    var c = countries[i];
    if (c !== 'domestic' && c !== 'import') continue;
    console.log('===', c, '===');
    var r = await runCountry(http, c);
    total.ok += r.ok;
    total.skip += r.skip;
    total.fail += r.fail;
  }
  console.log('[done] ok=' + total.ok + ' skip=' + total.skip + ' fail=' + total.fail);
  if (total.fail && !total.ok) process.exit(1);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
