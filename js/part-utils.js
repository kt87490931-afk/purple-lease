/**
 * 수입차부품 — 브랜드·상세 필드 정규화
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PurplePartUtils = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BRAND_LABELS = {
    tesla: '테슬라',
    benz: '벤츠',
    bmw: 'BMW',
    audi: '아우디'
  };

  function brandLabel(slug) {
    return BRAND_LABELS[String(slug || '').toLowerCase()] || slug || '';
  }

  function parseTagsInput(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (!value) return [];
    return String(value).split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function normalizePhotos(row, detailJson) {
    var dj = detailJson || {};
    if (dj.photos && dj.photos.length) return dj.photos.filter(Boolean);
    if (row.thumb_url) return [row.thumb_url];
    return [];
  }

  function normalizePartRow(row) {
    var r = row || {};
    var dj = r.detail_json || {};
    var photos = normalizePhotos(r, dj);
    return {
      id: r.listing_id,
      brand: r.brand || '',
      brandLabel: brandLabel(r.brand),
      category: r.category || '',
      name: r.name || '',
      price: r.price || 0,
      stock: r.stock || '재고있음',
      thumb: photos[0] || r.thumb_url || '',
      tags: r.tags || [],
      compatible: dj.compatible || '',
      maker: dj.maker || '',
      description: dj.description || '',
      photos: photos.length ? photos : (r.thumb_url ? [r.thumb_url] : []),
      sortOrder: r.sort_order || r.listing_id || 0
    };
  }

  return {
    BRAND_LABELS: BRAND_LABELS,
    brandLabel: brandLabel,
    parseTagsInput: parseTagsInput,
    normalizePartRow: normalizePartRow
  };
}));
