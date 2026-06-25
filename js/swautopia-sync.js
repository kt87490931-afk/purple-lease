/**
 * swautopia.co.kr → 퍼플 used_cars 매핑
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SwautopiaSync = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BASE = 'https://swautopia.co.kr';

  function getBaseUrl() {
    var cfg = (typeof window !== 'undefined' && window.SUPABASE_CONFIG) || {};
    return cfg.swautopiaBaseUrl || BASE;
  }

  function parseMediaList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (!value) return [];
    if (typeof value === 'string') {
      var trimmed = value.trim();
      if (!trimmed || trimmed === '[]') return [];
      try {
        var parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (_) {
        if (trimmed.indexOf(',') >= 0) {
          return trimmed.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        }
        return [trimmed];
      }
    }
    return [];
  }

  function absUrl(path) {
    if (!path) return '';
    var s = String(path).trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    return getBaseUrl().replace(/\/$/, '') + (s.indexOf('/') === 0 ? s : '/' + s);
  }

  function mapMediaList(value) {
    return parseMediaList(value).map(absUrl).filter(Boolean);
  }

  function fmtDateDot(dt) {
    if (!dt) return '';
    var p = String(dt).split(/[T ]/)[0].split('-');
    if (p.length < 3) return String(dt);
    return p[0] + '.' + p[1] + '.' + p[2];
  }

  function mapOrigin(carType) {
    var t = String(carType || '').toLowerCase();
    if (t === 'import' || t === 'imported') return 'import';
    if (t === 'export') return 'export';
    if (t === 'other') return 'other';
    return 'domestic';
  }

  function mapStatus(st) {
    return String(st || '').toLowerCase() === 'sale' ? '판매중' : '판매완료';
  }

  function isEvFuel(fuel) {
    var f = String(fuel || '');
    return /전기|EV|ev|하이브리드|HEV|PHEV/i.test(f);
  }

  function isElectric(fuel) {
    return /전기|EV/i.test(String(fuel || ''));
  }

  function buildCost(car) {
    var priceMan = Number(car.price) || 0;
    var vehicleWon = priceMan * 10000;
    var acqTax = car.acquisition_tax != null ? Number(car.acquisition_tax) : Math.round(vehicleWon * 0.075);
    if (isElectric(car.fuel)) {
      acqTax = Math.max(0, acqTax - 1400000);
    }
    var perfIns = Number(car.performance_insurance) || 0;
    var transfer = Number(car.transfer_fee) || 440000;
    var rows = [
      { label: '차량금액', value: vehicleWon },
      { label: '매도비', value: transfer }
    ];
    if (acqTax > 0) rows.push({ label: '취득세 (7.5%)', value: acqTax });
    if (perfIns > 0) rows.push({ label: '성능보험료', value: perfIns });
    return rows;
  }

  function buildOptions(carOptions) {
    var items = parseMediaList(carOptions);
    if (!items.length) return {};
    return { '옵션': items };
  }

  function splitDocs(urls) {
    var images = [];
    var links = [];
    urls.forEach(function (u) {
      if (/\.(jpe?g|png|gif|webp)(\?|$)/i.test(u)) images.push(u);
      else links.push(u);
    });
    return { images: images, links: links };
  }

  function mapCarToRow(car) {
    var photos = mapMediaList(car.images);
    var tags = parseMediaList(car.car_badges);
    var origin = mapOrigin(car.car_type);
    var priceMan = Number(car.price) || 0;
    var mileage = Number(car.mileage) || 0;
    var perf = splitDocs(mapMediaList(car.inspection_images));
    var underbody = mapMediaList(car.underbody_images);
    var batteryDocs = mapMediaList(car.battery_report_images);
    var soh = String(car.soh_value || '').trim();

    var detailJson = {
      name: car.title || car.model || '',
      origin: origin,
      status: mapStatus(car.status),
      year: Number(car.year) || 0,
      mileage: mileage,
      fuel: car.fuel || '',
      color: car.color || '',
      plate: car.car_number || '',
      parkLocation: car.region || '',
      registeredDate: fmtDateDot(car.created_at),
      price: priceMan,
      tags: tags,
      photos: photos,
      cost: buildCost(car),
      description: car.description || '',
      options: buildOptions(car.car_options),
      perfDocs: perf.images,
      perfLinks: perf.links,
      underbodyDocs: underbody,
      isEV: isEvFuel(car.fuel),
      battery: soh ? { soh: soh, capacity: '' } : null,
      batteryDocs: batteryDocs,
      videoUrl: car.video_url || '',
      brand: car.brand || '',
      model: car.model || '',
      segment: car.car_group || car.category || ''
    };

    var originLabel = origin === 'import' ? '수입차' : (origin === 'export' ? '수출차량' : '국산차');

    return {
      listing_id: car.id,
      name: detailJson.name,
      badge: originLabel,
      badge_class: origin === 'import' ? 'badge-purple' : 'badge-grad',
      meta: detailJson.year + '년 · ' + Math.round(mileage / 10000 * 10) / 10 + '만km',
      price: priceMan.toLocaleString('ko-KR') + '만원',
      price_num: priceMan,
      detail_slug: String(car.id),
      sort_order: car.id,
      is_active: String(car.status || '').toLowerCase() === 'sale',
      origin: origin,
      year: detailJson.year,
      fuel: detailJson.fuel,
      mileage: mileage,
      brand: detailJson.brand,
      segment: detailJson.segment,
      status: detailJson.status,
      photo_count: photos.length,
      thumb_url: photos[0] || '',
      tags: tags,
      detail_json: detailJson,
      sync_source: 'swautopia',
      source_url: getBaseUrl() + '/detail.html?id=' + car.id,
      last_synced_at: new Date().toISOString()
    };
  }

  async function fetchAllCars() {
    var res = await fetch(getBaseUrl() + '/api/cars');
    if (!res.ok) throw new Error('오토피아 매물 API 오류: HTTP ' + res.status);
    var data = await res.json();
    if (!Array.isArray(data)) throw new Error('오토피아 API 응답 형식 오류');
    return data.filter(function (c) {
      return String(c.status || '').toLowerCase() === 'sale';
    });
  }

  return {
    BASE: BASE,
    getBaseUrl: getBaseUrl,
    parseMediaList: parseMediaList,
    absUrl: absUrl,
    mapCarToRow: mapCarToRow,
    fetchAllCars: fetchAllCars
  };
}));
