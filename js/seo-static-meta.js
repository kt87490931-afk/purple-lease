/**
 * 정적 HTML head SEO 블록 생성 (어드민 미리보기 · 서버 patch 스크립트 공용)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PurpleSeoStaticMeta = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PAGE_TO_HTML = {
    '/': 'index.html',
    '/estimate': 'estimate.html',
    '/used-cars': 'used-cars.html',
    '/used-car-detail': 'used-car-detail.html',
    '/parts-register': 'parts-register.html',
    '/parts-detail': 'parts-detail.html',
    '/reviews-customer': 'reviews-customer.html',
    '/reviews-youtube': 'reviews-youtube.html',
    '/reviews-blog': 'reviews-blog.html',
    '/review-detail': 'review-detail.html',
    '/reviews': 'reviews.html'
  };

  function escAttr(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function pageUrl(siteUrl, pagePath) {
    var base = String(siteUrl || 'https://purpleauto.co.kr').replace(/\/$/, '');
    return pagePath === '/' ? base + '/' : base + pagePath;
  }

  function buildStaticMetaBlock(opts) {
    var siteName = opts.siteName || '퍼플오토';
    var siteUrl = opts.siteUrl || 'https://purpleauto.co.kr';
    var pagePath = opts.pagePath || '/';
    var title = opts.title || siteName;
    var description = opts.description || '';
    var keywords = opts.keywords || '';
    var ogTitle = opts.ogTitle || title;
    var ogDesc = opts.ogDescription || description;
    var twitterDesc = opts.twitterDescription || ogDesc;
    var ogImage = opts.ogImage || (siteUrl.replace(/\/$/, '') + '/assets/brand-logos/og-image.png');
    var canonical = pageUrl(siteUrl, pagePath);

    var lines = [];
    if (description) lines.push('<meta name="description" content="' + escAttr(description) + '">');
    if (keywords) lines.push('<meta name="keywords" content="' + escAttr(keywords) + '">');
    lines.push('<link rel="canonical" href="' + escAttr(canonical) + '">');
    lines.push('<meta property="og:type" content="website">');
    lines.push('<meta property="og:site_name" content="' + escAttr(siteName) + '">');
    lines.push('<meta property="og:title" content="' + escAttr(ogTitle) + '">');
    if (ogDesc) lines.push('<meta property="og:description" content="' + escAttr(ogDesc) + '">');
    lines.push('<meta property="og:url" content="' + escAttr(canonical) + '">');
    lines.push('<meta property="og:image" content="' + escAttr(ogImage) + '">');
    lines.push('<meta property="og:locale" content="ko_KR">');
    lines.push('<meta name="twitter:card" content="summary_large_image">');
    lines.push('<meta name="twitter:title" content="' + escAttr(ogTitle) + '">');
    if (twitterDesc) lines.push('<meta name="twitter:description" content="' + escAttr(twitterDesc) + '">');
    lines.push('<meta name="twitter:image" content="' + escAttr(ogImage) + '">');
    return lines.join('\n') + '\n';
  }

  return {
    PAGE_TO_HTML: PAGE_TO_HTML,
    escAttr: escAttr,
    pageUrl: pageUrl,
    buildStaticMetaBlock: buildStaticMetaBlock
  };
});
