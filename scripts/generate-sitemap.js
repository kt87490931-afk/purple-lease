#!/usr/bin/env node
/**
 * sitemap.xml 생성 (리뷰 URL 우선)
 * SUPABASE_URL + SUPABASE_ANON_KEY (또는 SERVICE_ROLE) 환경변수 필요
 */
'use strict';

var fs = require('fs');
var path = require('path');

var SUPABASE_URL = process.env.SUPABASE_URL || 'https://zliclwgiaqvilnnookyi.supabase.co';
var SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
var SITE_URL = (process.env.SITE_URL || 'https://purpleauto.co.kr').replace(/\/$/, '');
var OUT = path.join(__dirname, '..', 'sitemap.xml');

var fetchFn = global.fetch;
if (!fetchFn) {
  try { fetchFn = require('node-fetch'); } catch (e) {
    console.warn('[sitemap] fetch unavailable — static pages only');
  }
}

async function sbGet(table, query) {
  if (!fetchFn || !SUPABASE_KEY) return [];
  var url = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + table + '?' + query;
  var res = await fetchFn(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
  });
  if (!res.ok) return [];
  return res.json();
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function urlEntry(loc, priority, changefreq, lastmod) {
  var lm = lastmod ? '<lastmod>' + lastmod + '</lastmod>\n    ' : '';
  return '  <url>\n    <loc>' + esc(loc) + '</loc>\n    ' + lm +
    '<changefreq>' + changefreq + '</changefreq>\n    <priority>' + priority + '</priority>\n  </url>';
}

async function main() {
  var today = new Date().toISOString().slice(0, 10);
  var urls = [];

  var pageMeta = await sbGet('seo_page_meta', 'select=page_path,sitemap_priority,sitemap_changefreq,noindex&order=sitemap_priority.desc');
  if (pageMeta.length) {
    pageMeta.filter(function (p) { return !p.noindex; }).forEach(function (p) {
      var loc = p.page_path === '/' ? SITE_URL + '/' : SITE_URL + p.page_path;
      urls.push(urlEntry(loc, p.sitemap_priority || 0.5, p.sitemap_changefreq || 'weekly', today));
    });
  } else {
    [
      ['/reviews-customer', 1.0], ['/reviews-youtube', 0.95], ['/reviews-blog', 0.95],
      ['/', 0.85], ['/estimate', 0.8], ['/used-cars', 0.7], ['/parts-register', 0.6]
    ].forEach(function (pair) {
      var loc = pair[0] === '/' ? SITE_URL + '/' : SITE_URL + pair[0];
      urls.push(urlEntry(loc, pair[1], 'weekly', today));
    });
  }

  var reviews = await sbGet('customer_reviews', 'select=id,updated_at&is_active=eq.true&order=id.asc');
  reviews.forEach(function (r) {
    urls.push(urlEntry(SITE_URL + '/review-detail?id=' + r.id, 0.85, 'monthly', (r.updated_at || '').slice(0, 10) || today));
  });

  var cars = await sbGet('used_cars', 'select=listing_id,updated_at&is_active=eq.true&order=listing_id.asc');
  cars.forEach(function (c) {
    urls.push(urlEntry(SITE_URL + '/used-car-detail?id=' + c.listing_id, 0.6, 'weekly', (c.updated_at || '').slice(0, 10) || today));
  });

  var parts = await sbGet('parts', 'select=listing_id,updated_at&is_active=eq.true&order=listing_id.asc');
  parts.forEach(function (p) {
    urls.push(urlEntry(SITE_URL + '/parts-detail?id=' + p.listing_id, 0.55, 'weekly', (p.updated_at || '').slice(0, 10) || today));
  });

  var xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join('\n') + '\n</urlset>\n';

  fs.writeFileSync(OUT, xml, 'utf8');
  console.log('[sitemap] wrote ' + OUT + ' (' + urls.length + ' URLs)');
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
