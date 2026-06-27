/**
 * SEO meta / verification / canonical — Supabase seo_settings + seo_page_meta
 */
(function () {
  'use strict';

  var SITE_URL = 'https://purpleauto.co.kr';
  var OG_IMAGE = SITE_URL + '/assets/brand-logos/og-image.png';

  var FALLBACK = {
    site_name: '퍼플오토',
    title_suffix: '| 퍼플오토',
    default_description: '선납금 0원, 보증금 걱정 없는 무보증 장기렌트부터 위약금 없는 리스승계매입까지. 현대·기아·제네시스·BMW·벤츠·아우디 전 차종 무료 견적, 5일 이내 즉시출고. 경기 용인 퍼플오토.',
    og_image_url: OG_IMAGE,
    google_verification: '',
    naver_verification: '',
    site_url: SITE_URL
  };

  var PAGE_FALLBACK = {
    '/': {
      title: '퍼플오토 — 오토리스·장기렌트 승계매입 전문업체',
      description: '선납금 0원, 보증금 걱정 없는 무보증 장기렌트부터 위약금 없는 리스승계매입까지. 현대·기아·제네시스·BMW·벤츠·아우디 전 차종 무료 견적, 5일 이내 즉시출고. 경기 용인 퍼플오토.',
      meta_keywords: '장기렌트,오토리스,리스승계,리스승계매입,렌트승계,승계매입,무보증 장기렌트,선납금 0원 장기렌트,즉시출고 장기렌트,법인 장기렌트,용인 장기렌트,기흥 장기렌트,용인 리스승계,경기 오토리스,제네시스 장기렌트,그랜저 장기렌트,G80 리스,BMW 리스승계,벤츠 장기렌트,아우디 리스,중고차 매물,수입차부품',
      og_title: '퍼플오토 — 오토리스·장기렌트 승계매입 전문업체',
      og_description: '선납금 0원, 보증금 걱정 없는 무보증 장기렌트부터 위약금 없는 리스승계매입까지. 지금 무료 견적을 받아보세요.',
      twitter_description: '선납금 0원 무보증 장기렌트, 위약금 없는 리스승계매입. 지금 무료 견적받기.'
    },
    '/estimate': {
      title: '장기렌트·리스 간편견적 | 퍼플오토',
      description: '브랜드와 모델만 선택하면 끝. 국산차·수입차 장기렌트·리스 견적을 비대면으로 간편하게 받아보세요. 보증금·선납금·이용기간 맞춤 설계, 운영자 검수 옵션만 제공합니다.',
      meta_keywords: '장기렌트 견적,리스 견적,오토리스 견적,무료 견적,비대면 견적,장기렌트 비교,리스 비교,승계매입 견적,법인 리스,개인 리스,장기렌트 시뮬레이션,월렌트료 계산,제네시스 견적,현대 장기렌트,기아 장기렌트,수입차 리스 견적',
      og_title: '장기렌트·리스 간편견적 | 퍼플오토',
      og_description: '브랜드와 모델만 선택하면 끝. 국산차·수입차 장기렌트·리스 견적을 비대면으로 간편하게 받아보세요.',
      twitter_description: '국산차·수입차 장기렌트·리스 견적을 비대면으로 간편하게 받아보세요.'
    },
    '/used-cars': {
      title: '중고차 매물 | 퍼플오토',
      description: '무사고·짧은주행·성능점검기록부까지 확인 가능한 중고차 매물을 한눈에. 국산차·수입차·수출차량까지, 가격·연식·주행거리로 검색하고 최저가 매물을 만나보세요.',
      meta_keywords: '중고차 매물,중고차 매매,무사고 중고차,성능점검 중고차,수입차 중고차,국산차 중고차,중고차 시세,중고차 구매,중고차 직거래,용인 중고차,경기 중고차,제네시스 중고차,현대 중고차,기아 중고차,BMW 중고차,벤츠 중고차,중고차 수출,중고차 매입,승계매입 차량',
      og_title: '중고차 매물 | 퍼플오토',
      og_description: '무사고·성능점검기록부까지 확인 가능한 검수 중고차 매물을 한눈에 만나보세요.',
      twitter_description: '무사고·성능점검 검수 중고차 매물을 한눈에 만나보세요.'
    },
    '/used-car-detail': {
      title: '중고차 상세 | 퍼플오토',
      description: '퍼플오토 중고차 상세 정보.',
      meta_keywords: '중고차,중고차 매물,퍼플오토',
      og_title: '중고차 상세 | 퍼플오토',
      og_description: '퍼플오토 중고차 상세 정보.',
      twitter_description: '퍼플오토 중고차 상세 정보.'
    },
    '/parts-register': {
      title: '수입차부품 | 퍼플오토',
      description: '테슬라 모델3·모델Y 부품을 중심으로 운영자가 직접 검수한 수입차부품만 판매합니다. 와이퍼, 타이어, 브레이크, 충전케이블까지 가격 확인 후 바로 상담하세요.',
      meta_keywords: '수입차부품,테슬라 부품,모델3 부품,모델Y 부품,테슬라 와이퍼,테슬라 타이어,테슬라 충전케이블,테슬라 브레이크패드,벤츠 부품,BMW 부품,아우디 부품,수입차 정품호환,수입차 순정부품,전기차 부품,테슬라 액세서리,테슬라 외장튜닝',
      og_title: '수입차부품 | 퍼플오토',
      og_description: '테슬라 모델3·모델Y 부품을 중심으로 운영자가 직접 검수한 수입차부품만 판매합니다.',
      twitter_description: '테슬라 모델3·모델Y 부품을 중심으로 검수한 수입차부품을 만나보세요.'
    },
    '/parts-detail': {
      title: '부품 상세 | 퍼플오토',
      description: '수입차 부품 상세.',
      meta_keywords: '수입차부품,테슬라 부품,퍼플오토',
      og_title: '부품 상세 | 퍼플오토',
      og_description: '수입차 부품 상세.',
      twitter_description: '수입차 부품 상세.'
    },
    '/reviews-customer': {
      title: '고객후기 | 퍼플오토',
      description: '퍼플오토와 함께한 고객들의 실제 후기를 만나보세요. 퍼플오토 유튜브, 블로그, 고객후기까지 한곳에서 확인할 수 있습니다.',
      meta_keywords: '퍼플오토 후기,장기렌트 후기,리스 후기,승계매입 후기,오토리스 후기,퍼플리뷰,장기렌트 이용후기,리스승계 이용후기,장기렌트 추천,오토리스 추천',
      og_title: '고객후기 | 퍼플오토',
      og_description: '퍼플오토와 함께한 고객들의 실제 후기를 만나보세요.',
      twitter_description: '퍼플오토와 함께한 고객들의 실제 후기를 만나보세요.'
    },
    '/reviews-youtube': {
      title: '퍼플오토 유튜브 | 퍼플오토',
      description: '퍼플오토 공식 유튜브 — 차량 리뷰·출고 영상.',
      meta_keywords: '퍼플오토 유튜브,장기렌트,리스,퍼플리뷰',
      og_title: '퍼플오토 유튜브 | 퍼플오토',
      og_description: '퍼플오토 공식 유튜브 — 차량 리뷰·출고 영상.',
      twitter_description: '퍼플오토 공식 유튜브 — 차량 리뷰·출고 영상.'
    },
    '/reviews-blog': {
      title: '퍼플오토 블로그 | 퍼플오토',
      description: '퍼플오토 블로그 — 자동차·렌트 정보 글.',
      meta_keywords: '퍼플오토 블로그,장기렌트,리스,퍼플리뷰',
      og_title: '퍼플오토 블로그 | 퍼플오토',
      og_description: '퍼플오토 블로그 — 자동차·렌트 정보 글.',
      twitter_description: '퍼플오토 블로그 — 자동차·렌트 정보 글.'
    },
    '/review-detail': {
      title: '후기 상세 | 퍼플오토',
      description: '퍼플오토 고객후기 상세.',
      meta_keywords: '퍼플오토 후기,장기렌트 후기,퍼플리뷰',
      og_title: '후기 상세 | 퍼플오토',
      og_description: '퍼플오토 고객후기 상세.',
      twitter_description: '퍼플오토 고객후기 상세.'
    },
    '/reviews': {
      title: '퍼플리뷰 | 퍼플오토',
      description: '퍼플오토 퍼플리뷰.',
      meta_keywords: '퍼플리뷰,퍼플오토 후기',
      og_title: '퍼플리뷰 | 퍼플오토',
      og_description: '퍼플오토 퍼플리뷰.',
      twitter_description: '퍼플오토 퍼플리뷰.'
    }
  };

  function seoPath() {
    var p = window.location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    if (p !== '/' && p.endsWith('/')) p = p.slice(0, -1);
    return p || '/';
  }

  function pick(pageMeta, fb, key) {
    if (pageMeta && pageMeta[key]) return pageMeta[key];
    if (fb && fb[key]) return fb[key];
    return '';
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
    var canonicalClean = canonical.split('?')[0];

    var title = pick(pageMeta, fb, 'title') || document.title;
    var desc = pick(pageMeta, fb, 'description') || settings.default_description || FALLBACK.default_description;
    var keywords = pick(pageMeta, fb, 'meta_keywords');
    var ogTitle = pick(pageMeta, fb, 'og_title') || title;
    var ogDesc = pick(pageMeta, fb, 'og_description') || desc;
    var twitterDesc = pick(pageMeta, fb, 'twitter_description') || ogDesc;
    var ogImage = settings.og_image_url || FALLBACK.og_image_url;

    if (pageMeta && pageMeta.noindex) {
      upsertMeta('robots', 'noindex, nofollow', false);
    }

    document.title = title;
    upsertMeta('description', desc, false);
    if (keywords) upsertMeta('keywords', keywords, false);
    upsertLink('canonical', canonicalClean);

    upsertMeta('og:type', 'website', true);
    upsertMeta('og:site_name', settings.site_name || FALLBACK.site_name, true);
    upsertMeta('og:title', ogTitle, true);
    upsertMeta('og:description', ogDesc, true);
    upsertMeta('og:url', canonicalClean, true);
    upsertMeta('og:image', ogImage, true);
    upsertMeta('og:locale', 'ko_KR', true);

    upsertMeta('twitter:card', 'summary_large_image', false);
    upsertMeta('twitter:title', ogTitle, false);
    upsertMeta('twitter:description', twitterDesc, false);
    upsertMeta('twitter:image', ogImage, false);

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
