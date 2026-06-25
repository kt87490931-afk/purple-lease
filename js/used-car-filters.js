/**
 * 중고차 목록 필터 — 수동 등록·swautopia 동기화 공통 정규화
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PurpleUsedCarFilters = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function inferBrandFromName(name) {
    if (!name) return '';
    return String(name).split(/\s+/)[0].trim();
  }

  function normalizeFilterFields(row) {
    var r = row || {};
    var d = r.detail_json || {};
    var brand = String(r.brand || d.brand || '').trim();
    var fuel = String(r.fuel || d.fuel || '').trim();
    var segment = String(r.segment || d.segment || '').trim();
    var origin = String(r.origin || d.origin || 'domestic').trim() || 'domestic';

    if (!brand) brand = inferBrandFromName(r.name);

    return {
      brand: brand,
      fuel: fuel,
      segment: segment,
      origin: origin
    };
  }

  function originBadge(origin) {
    if (origin === 'import') return { badge: '수입차', badge_class: 'badge-purple' };
    if (origin === 'export') return { badge: '수출차량', badge_class: 'badge-grad' };
    if (origin === 'other') return { badge: '기타', badge_class: 'badge-grad' };
    return { badge: '국산차', badge_class: 'badge-grad' };
  }

  function buildMeta(year, mileage, fuel) {
    var y = year ? year + '년' : '';
    var km = Math.round((mileage || 0) / 10000 * 10) / 10 + '만km';
    var parts = [y, km, fuel || ''].filter(Boolean);
    return parts.join(' · ');
  }

  return {
    inferBrandFromName: inferBrandFromName,
    normalizeFilterFields: normalizeFilterFields,
    originBadge: originBadge,
    buildMeta: buildMeta
  };
}));
