#!/usr/bin/env node
/**
 * sitemap.xml 생성 (리뷰 URL 우선)
 * SUPABASE_URL + SUPABASE_ANON_KEY (또는 SERVICE_ROLE) 환경변수 필요
 */
'use strict';

var fs = require('fs');
var path = require('path');
var SitemapBuilder = require('../js/sitemap-builder.js');

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

async function main() {
  var pageMeta = await sbGet('seo_page_meta', 'select=page_path,sitemap_priority,sitemap_changefreq,noindex&order=sitemap_priority.desc');
  var reviews = await sbGet('customer_reviews', 'select=listing_id,id,updated_at,published_at,created_at&is_active=eq.true&order=listing_id.asc');
  var cars = await sbGet('used_cars', 'select=listing_id,id,updated_at,created_at&is_active=eq.true&order=listing_id.asc');
  var parts = await sbGet('parts', 'select=listing_id,id,updated_at,created_at&is_active=eq.true&order=listing_id.asc');

  var xml = await SitemapBuilder.buildXml({
    siteUrl: SITE_URL,
    pageMeta: pageMeta,
    reviews: reviews,
    usedCars: cars,
    parts: parts
  });

  fs.writeFileSync(OUT, xml, 'utf8');
  console.log('[sitemap] wrote ' + OUT + ' (' + SitemapBuilder.urlCount(xml) + ' URLs)');
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
