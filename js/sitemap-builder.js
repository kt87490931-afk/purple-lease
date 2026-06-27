/**
 * sitemap.xml 빌더 (어드민 + Node 스크립트 공용)
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.SitemapBuilder = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULT_SITE_URL = 'https://purpleauto.co.kr';

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function urlEntry(loc, priority, changefreq, lastmod) {
    var lm = lastmod ? '<lastmod>' + lastmod + '</lastmod>\n    ' : '';
    return '  <url>\n    <loc>' + esc(loc) + '</loc>\n    ' + lm +
      '<changefreq>' + changefreq + '</changefreq>\n    <priority>' + priority + '</priority>\n  </url>';
  }

  function pageLoc(siteUrl, pagePath) {
    return pagePath === '/' ? siteUrl + '/' : siteUrl + pagePath;
  }

  function lastmodFromRow(row, today) {
    var d = row.updated_at || row.published_at || row.created_at || '';
    return d ? String(d).slice(0, 10) : today;
  }

  async function buildXml(deps) {
    var siteUrl = (deps.siteUrl || DEFAULT_SITE_URL).replace(/\/$/, '');
    var today = new Date().toISOString().slice(0, 10);
    var urls = [];
    var pageMeta = deps.pageMeta || [];

    if (pageMeta.length) {
      pageMeta.filter(function (p) { return !p.noindex; }).forEach(function (p) {
        urls.push(urlEntry(
          pageLoc(siteUrl, p.page_path),
          p.sitemap_priority || 0.5,
          p.sitemap_changefreq || 'weekly',
          today
        ));
      });
    } else {
      [
        ['/reviews-customer', 1.0], ['/reviews-youtube', 0.95], ['/reviews-blog', 0.95],
        ['/', 0.85], ['/estimate', 0.8], ['/used-cars', 0.7], ['/parts-register', 0.6]
      ].forEach(function (pair) {
        urls.push(urlEntry(pageLoc(siteUrl, pair[0]), pair[1], 'weekly', today));
      });
    }

    (deps.reviews || []).forEach(function (r) {
      var id = r.listing_id != null ? r.listing_id : r.id;
      if (id == null) return;
      urls.push(urlEntry(
        siteUrl + '/review-detail?id=' + id,
        0.85,
        'monthly',
        lastmodFromRow(r, today)
      ));
    });

    (deps.usedCars || []).forEach(function (c) {
      var id = c.listing_id != null ? c.listing_id : c.id;
      if (id == null) return;
      urls.push(urlEntry(
        siteUrl + '/used-car-detail?id=' + id,
        0.6,
        'weekly',
        lastmodFromRow(c, today)
      ));
    });

    (deps.parts || []).forEach(function (p) {
      var id = p.listing_id != null ? p.listing_id : p.id;
      if (id == null) return;
      urls.push(urlEntry(
        siteUrl + '/parts-detail?id=' + id,
        0.55,
        'weekly',
        lastmodFromRow(p, today)
      ));
    });

    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.join('\n') + '\n</urlset>\n';
  }

  return { buildXml: buildXml, urlCount: function (xml) { return (xml.match(/<url>/g) || []).length; } };
});
