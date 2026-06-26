/**
 * Supabase lease catalog → estimate.html brandData / modelData / vehicleDetail 변환
 */
(function (global) {
  'use strict';

  var BRAND_LOGO_BY_NAME = {
    '현대': 'hyundai', '기아': 'kia', '제네시스': 'genesis', '쉐보레': 'chevrolet',
    '르노코리아': 'renault', 'KGM': 'kgm', 'BMW': 'bmw', '벤츠': 'benz', '아우디': 'audi',
    '폴스타': 'polestar', '볼보': 'volvo', '폭스바겐': 'vw', '토요타': 'toyota',
    '렉서스': 'lexus', '포드': 'ford', '미니': 'mini', '포르쉐': 'porsche', '혼다': 'honda',
    '지프': 'jeep', '랜드로버': 'landrover', '푸조': 'peugeot', '테슬라': 'tesla',
    '링컨': 'lincoln', '캐딜락': 'cadillac', '마세라티': 'maserati', '로터스': 'lotus', 'BYD': 'byd'
  };

  var BRAND_KS_ID_BY_NAME = {
    '현대': 303, '기아': 307, '제네시스': 304, '쉐보레': 312, '르노코리아': 321, 'KGM': 326,
    'BMW': 362, '벤츠': 349, '아우디': 371, '폴스타': 458, '볼보': 459, '폭스바겐': 376,
    '토요타': 491, '렉서스': 486, '포드': 569, '미니': 367, '포르쉐': 381, '혼다': 500,
    '지프': 587, '랜드로버': 399, '푸조': 413, '테슬라': 611, '링컨': 573, '캐딜락': 546,
    '마세라티': 445, '로터스': 408, 'BYD': 380
  };

  function getKsRentcarBase() {
    if (typeof window !== 'undefined' && window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.ksRentcarBaseUrl) {
      return String(window.SUPABASE_CONFIG.ksRentcarBaseUrl).replace(/\/$/, '');
    }
    return 'https://ks-rentcar.com';
  }

  function resolveKsBrandLogoUrl(ksBrandId) {
    var id = parseInt(ksBrandId, 10);
    if (!id) return '';
    return getKsRentcarBase() + '/data/dbrand/e' + id + '.png';
  }

  function decodeHtml(s) {
    if (!s) return '';
    if (typeof document === 'undefined') return String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    var el = document.createElement('textarea');
    el.innerHTML = s;
    return el.value;
  }

  function resolveBrandLogo(name, logoUrl, ksBrandId) {
    if (logoUrl && String(logoUrl).trim()) return logoUrl;
    var ksId = ksBrandId || BRAND_KS_ID_BY_NAME[name];
    if (ksId) return resolveKsBrandLogoUrl(ksId);
    var key = BRAND_LOGO_BY_NAME[name];
    return key ? '/assets/brand-logos/' + key + '.png' : '';
  }

  function mapOuterColors(trim) {
    var out = (trim && trim.colors && trim.colors.out) || [];
    return out.map(function (c) {
      return {
        name: decodeHtml(c.name || ''),
        hex: c.style || '#cccccc',
        surcharge: 0,
        code: c.code || ''
      };
    });
  }

  function mapOptions(opts) {
    return (opts || []).map(function (o) {
      return {
        name: decodeHtml(o.name || ''),
        price: o.priceWon || (o.priceMan || 0) * 10000
      };
    });
  }

  function buildTrimGroups(trims) {
    var order = [];
    var byLineup = {};
    (trims || []).forEach(function (t) {
      var label = decodeHtml(t.lineupName || '세부모델');
      if (!byLineup[label]) {
        byLineup[label] = { label: label, trims: [] };
        order.push(label);
      }
      byLineup[label].trims.push({
        name: decodeHtml(t.name || ''),
        price: (t.basePriceMan || 0) * 10000,
        trimId: String(t.id),
        _raw: t
      });
    });
    return order.map(function (k) { return byLineup[k]; });
  }

  function applyTrimToDetail(detail, groupIdx, trimIdx) {
    if (!detail || !detail.trimGroups || !detail.trimGroups.length) {
      if (detail) {
        detail.colors = [];
        detail.options = [];
      }
      return;
    }
    var gi = groupIdx == null ? 0 : groupIdx;
    var ti = trimIdx == null ? 0 : trimIdx;
    var g = detail.trimGroups[gi];
    var t = g && g.trims[ti];
    if (!t || !t._raw) {
      detail.colors = [];
      detail.options = [];
      return;
    }
    detail.colors = mapOuterColors(t._raw);
    detail.options = mapOptions(t._raw.options);
    detail._activeGroupIdx = gi;
    detail._activeTrimIdx = ti;
  }

  function buildVehicleDetail(model, brand) {
    var cfg = model.config || {};
    var trims = cfg.trims || [];
    var detail = {
      brandName: brand.name,
      brandLogo: resolveBrandLogo(brand.name, brand.logo, brand.ksBrandId),
      modelName: model.name,
      img: model.img || '',
      meta: (trims[0] && trims[0].lineupName) ? decodeHtml(trims[0].lineupName) : '',
      trimGroups: buildTrimGroups(trims),
      colors: [],
      options: []
    };
    applyTrimToDetail(detail, 0, 0);
    return detail;
  }

  function clearObject(obj) {
    Object.keys(obj).forEach(function (k) { delete obj[k]; });
  }

  function ingestBrandList(brands, brandData, modelData, vehicleDetail) {
    (brands || []).forEach(function (b) {
      var logo = resolveBrandLogo(b.name, b.logo, b.ksBrandId);
      brandData.push({ id: b.id, name: b.name, logo: logo, ksBrandId: b.ksBrandId || null });
      var models = b.models || [];
      if (!models.length) return;
      modelData[b.id] = models.map(function (m) {
        return {
          id: m.id,
          name: m.name,
          priceFrom: m.priceFrom,
          priceTo: m.priceTo,
          img: m.img || ''
        };
      });
      models.forEach(function (m) {
        vehicleDetail[m.id] = buildVehicleDetail(m, { name: b.name, logo: logo });
      });
    });
  }

  function applyCatalog(catalog, brandData, modelData, vehicleDetail) {
    if (!catalog) return;
    brandData.domestic.splice(0, brandData.domestic.length);
    brandData.import.splice(0, brandData.import.length);
    clearObject(modelData);
    clearObject(vehicleDetail);
    ingestBrandList(catalog.domestic, brandData.domestic, modelData, vehicleDetail);
    ingestBrandList(catalog.import, brandData.import, modelData, vehicleDetail);
  }

  function trimConfigSummary(config) {
    var trims = (config && config.trims) || [];
    if (!trims.length) return { trims: 0, options: 0, colors: 0, label: '트림 없음' };
    var optN = 0;
    var colorN = 0;
    trims.forEach(function (t) {
      optN += (t.options || []).length;
      colorN += ((t.colors && t.colors.out) || []).length;
    });
    return {
      trims: trims.length,
      options: optN,
      colors: colorN,
      label: '트림 ' + trims.length + ' · 색상 · 옵션 ' + optN
    };
  }

  global.PurpleLeaseCatalog = {
    applyCatalog: applyCatalog,
    applyTrimToDetail: applyTrimToDetail,
    resolveBrandLogo: resolveBrandLogo,
    resolveKsBrandLogoUrl: resolveKsBrandLogoUrl,
    trimConfigSummary: trimConfigSummary
  };
})(typeof window !== 'undefined' ? window : global);
