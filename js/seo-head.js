/**
 * SEO meta / verification / canonical — Supabase seo_settings + seo_page_meta
 */
(function () {
  'use strict';

  var SITE_URL = 'https://purpleauto.co.kr';

  var FALLBACK = {
    site_name: '퍼플오토',
    title_suffix: '| 퍼플오토',
    default_description: '퍼플오토 — 오토리스·장기렌트·리스·중고차·수입차부품 전문. 무료 견적과 맞춤 상담을 받아보세요.',
    og_image_url: SITE_URL + '/assets/brand-logos/purple-logo.png',
    google_verification: '',
    naver_verification: '',
    site_url: SITE_URL
  };

  var PAGE_FALLBACK = {
    '/': { title: '퍼플오토 — 오토리스 · 장기렌트 승계매입전문업체', description: '퍼플오토 — 무보증 장기렌트·리스·승계매입·중고차 전문.' },
    '/estimate': { title: '간편견적 | 퍼플오토', description: '비대면 간편 견적 — 국산·수입 신차 리스·장기렌트.' },
    '/used-cars': { title: '중고차 매물 | 퍼플오토', description: '퍼플오토 중고차 매물.' },
    '/used-car-detail': { title: '중고차 상세 | 퍼플오토', description: '퍼플오토 중고차 상세.' },
    '/parts-register': { title: '수입차부품 | 퍼플오토', description: '수입차 부품.' },
    '/parts-detail': { title: '부품 상세 | 퍼플오토', description: '수입차 부품 상세.' },
    '/reviews-customer': { title: '고객후기 | 퍼플오토', description: '퍼플오토 고객후기 — 장기렌트·리스 출고 후기.' },
    '/reviews-youtube': { title: '퍼플오토 유튜브 | 퍼플오토', description: '퍼플오토 공식 유튜브.' },
    '/reviews-blog': { title: '퍼플오토 블로그 | 퍼플오토', description: '퍼플오토 블로그.' },
    '/review-detail': { title: '후기 상세 | 퍼플오토', description: '퍼플오토 후기 상세.' },
    '/reviews': { title: '퍼플리뷰 | 퍼플오토', description: '퍼플오토 퍼플리뷰.' }
  };

  function seoPath() {
    var p = window.location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    if (p !== '/' && p.endsWith('/')) p = p.slice(0, -1);
    return p || '/';
  }

  function upsertMeta(name, content, isProperty) {
    if (!content) return;
    var sel = isProperty ? 'meta[property="' + name + '"]' : 'meta[name="' + name + '"]';
    var el = document.querySelector(sel);
    if (!el) {
      el = document.createElement('meta');
      if (isProperty) el.setAttribute('property', name);
      else el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function upsertLink(rel, href) {
    if (!href) return;
    var el = document.querySelector('link[rel="' + rel + '"]');
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  function applySeo(settings, pageMeta) {
    var path = seoPath();
    var fb = PAGE_FALLBACK[path] || {};
    var siteUrl = (settings.site_url || FALLBACK.site_url).replace(/\/$/, '');
    var canonical = siteUrl + (path === '/' ? '/' : path);
    if (window.location.search) canonical += window.location.search;

    var title = (pageMeta && pageMeta.title) || fb.title || document.title;
    var desc = (pageMeta && pageMeta.description) || fb.description || settings.default_description || FALLBACK.default_description;
    var ogTitle = (pageMeta && pageMeta.og_title) || title;
    var ogImage = settings.og_image_url || FALLBACK.og_image_url;

    if (pageMeta && pageMeta.noindex) {
      upsertMeta('robots', 'noindex, nofollow', false);
    }

    document.title = title;
    upsertMeta('description', desc, false);
    upsertLink('canonical', canonical.split('?')[0]);

    upsertMeta('og:type', 'website', true);
    upsertMeta('og:site_name', settings.site_name || FALLBACK.site_name, true);
    upsertMeta('og:title', ogTitle, true);
    upsertMeta('og:description', desc, true);
    upsertMeta('og:url', canonical.split('?')[0], true);
    upsertMeta('og:image', ogImage, true);
    upsertMeta('og:locale', 'ko_KR', true);

    if (settings.google_verification) upsertMeta('google-site-verification', settings.google_verification, false);
    if (settings.naver_verification) upsertMeta('naver-site-verification', settings.naver_verification, false);
  }

  async function sbGet(table, query) {
    var cfg = window.SUPABASE_CONFIG;
    if (!cfg || !cfg.url || !cfg.anonKey) return null;
    var url = cfg.url.replace(/\/$/, '') + '/rest/v1/' + table + (query ? '?' + query : '');
    var res = await fetch(url, {
      headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey }
    });
    if (!res.ok) return null;
    return res.json();
  }

  async function bootstrap() {
    var settings = FALLBACK;
    var pageMeta = null;
    var path = encodeURIComponent(seoPath());

    try {
      var sRows = await sbGet('seo_settings', 'id=eq.1&select=*');
      if (sRows && sRows[0]) settings = Object.assign({}, FALLBACK, sRows[0]);
      var pRows = await sbGet('seo_page_meta', 'page_path=eq.' + path + '&select=*');
      if (pRows && pRows[0]) pageMeta = pRows[0];
    } catch (e) {
      console.warn('[SEO]', e);
    }
    applySeo(settings, pageMeta);
    window.PurpleSeoApplied = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
