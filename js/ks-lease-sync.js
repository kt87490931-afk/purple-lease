/**
 * KS오토플랜(ks-rentcar.com) → lease_brands / lease_models 동기화
 * 브라우저(KsLeaseSync) + Node(module.exports) 공용
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.KsLeaseSync = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BASE = 'https://ks-rentcar.com';
  var AJAX = '/lib/ajax/infoCar2024/index/';

  function getConfig() {
    if (typeof window !== 'undefined' && window.SUPABASE_CONFIG) return window.SUPABASE_CONFIG;
    if (typeof global !== 'undefined' && global.SUPABASE_CONFIG) return global.SUPABASE_CONFIG;
    return {};
  }

  function getBaseUrl() {
    var cfg = getConfig();
    return (cfg.ksRentcarBaseUrl || BASE).replace(/\/$/, '');
  }

  function buildKsUrl(path) {
    var cfg = getConfig();
    var p = !path ? '' : (path.indexOf('/') === 0 ? path : '/' + path);
    if (cfg.ksRentcarEdgeProxyUrl) {
      return cfg.ksRentcarEdgeProxyUrl.replace(/\/$/, '') + '?path=' + encodeURIComponent(p);
    }
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      var proxy = cfg.ksRentcarProxyPath;
      if (proxy) {
        var proxyPath = proxy.indexOf('/') === 0 ? proxy : '/' + proxy;
        return (window.location.origin + proxyPath.replace(/\/$/, '') + p).replace(/([^:]\/)\/+/g, '$1');
      }
    }
    return getBaseUrl() + p;
  }

  function isEdgeProxyUrl(url) {
    var cfg = getConfig();
    if (!cfg.ksRentcarEdgeProxyUrl) return false;
    var base = cfg.ksRentcarEdgeProxyUrl.replace(/\/$/, '');
    return String(url || '').indexOf(base) === 0;
  }

  function isSameOriginKs(url) {
    if (typeof window === 'undefined' || !window.location) return false;
    if (isEdgeProxyUrl(url)) return false;
    return String(url || '').indexOf(window.location.origin) === 0;
  }

  function ksCountryParam(origin) {
    return origin === 'import' ? 'imported' : 'domestic';
  }

  function slugify(text, fallback) {
    var s = String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!s || !/[a-z0-9]/.test(s)) return fallback;
    return s.slice(0, 48);
  }

  function wonToManStr(won) {
    var n = Math.round(Number(won) / 10000);
    if (!n) return '';
    return n.toLocaleString('ko-KR');
  }

  function absKsUrl(path) {
    if (!path) return '';
    var s = String(path).trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    return getBaseUrl() + (s.indexOf('/') === 0 ? s : '/' + s);
  }

  function pickModelImage(model) {
    if (model.carImgArr && model.carImgArr[0] && model.carImgArr[0].fileSrc) {
      return absKsUrl(model.carImgArr[0].fileSrc);
    }
    if (model.imgInfoJson) {
      try {
        var arr = JSON.parse(model.imgInfoJson);
        if (arr && arr[0] && arr[0].fileSrc) return absKsUrl(arr[0].fileSrc);
      } catch (_) { /* ignore */ }
    }
    return '';
  }

  function extractJsObject(html, varName) {
    var marker = 'let ' + varName + ' =';
    var start = html.indexOf(marker);
    if (start < 0) return null;
    start = html.indexOf('{', start);
    if (start < 0) return null;
    var depth = 0;
    var inStr = false;
    var strCh = '';
    for (var i = start; i < html.length; i++) {
      var ch = html[i];
      if (inStr) {
        if (ch === strCh && html[i - 1] !== '\\') inStr = false;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inStr = true;
        strCh = ch;
        continue;
      }
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(html.slice(start, i + 1));
          } catch (e) {
            return null;
          }
        }
      }
    }
    return null;
  }

  function decodeHtmlText(s) {
    if (!s) return '';
    return String(s)
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(parseInt(n, 10)); });
  }

  function parseLineupMapFromHtml(html) {
    var map = {};
    var blocks = html.split('class="input-arrow2"');
    for (var i = 1; i < blocks.length; i++) {
      var block = blocks[i];
      var lineupId = (block.match(/data-lineup="(\d+)"/) || [])[1];
      var name = (block.match(/data-lineupName>([^<]*)/) || [])[1];
      if (lineupId && name) map[lineupId] = decodeHtmlText(name.trim());
    }
    return map;
  }

  function parseTrimLabelsFromHtml(html) {
    var map = {};
    var re = /id="trim_(\d+)"[^>]*value="(\d+)"[\s\S]*?<label[^>]*for="trim_\1"[\s\S]*?<span class="txt">([^<]*)/gi;
    var m;
    while ((m = re.exec(html))) {
      map[m[1]] = decodeHtmlText((m[3] || '').trim());
    }
    return map;
  }

  function enrichTrimsFromHtml(html, trims) {
    var lineupMap = parseLineupMapFromHtml(html);
    var labelMap = parseTrimLabelsFromHtml(html);
    (trims || []).forEach(function (t) {
      var tid = String(t.id);
      if (labelMap[tid]) t.name = labelMap[tid];
      if (t.lineupId && lineupMap[t.lineupId]) t.lineupName = lineupMap[t.lineupId];
    });
    return { lineupMap: lineupMap, trims: trims };
  }

  function parseTrimsFromHtml(html) {
    var trims = [];
    var re = /<input[^>]+name="input\[trim\]"[^>]*>/gi;
    var m;
    while ((m = re.exec(html))) {
      var tag = m[0];
      var value = (tag.match(/value="(\d+)"/) || [])[1];
      if (!value) continue;
      trims.push({
        id: value,
        modelId: (tag.match(/data-model="(\d+)"/) || [])[1] || '',
        lineupId: (tag.match(/data-lineup="(\d+)"/) || [])[1] || '',
        basePriceMan: parseInt((tag.match(/data-trimPrice="(\d+)"/) || [])[1], 10) || 0,
        name: ''
      });
    }
    return enrichTrimsFromHtml(html, trims).trims;
  }

  function isUsableTrimRow(row) {
    if (!row) return false;
    var hasName = row.name && String(row.name).trim();
    var opts = (row.options || []).length;
    var out = (row.colors && row.colors.out || []).length;
    var inn = (row.innerColors || []).length || (row.colors && row.colors.in || []).length;
    return !!(hasName || opts > 0 || out > 0 || inn > 0);
  }

  function createHttp() {
    var cookie = '';
    var fetchFn = (typeof fetch !== 'undefined') ? fetch.bind(globalThis) : null;
    var supabaseClient = null;
    if (typeof window !== 'undefined' && window.PurpleAdminAuth) {
      supabaseClient = window.PurpleAdminAuth.getClient();
    }

    async function invokeProxy(method, path, body) {
      if (!supabaseClient) throw new Error('Supabase 클라이언트 없음');
      var res = await supabaseClient.functions.invoke('ks-rentcar-proxy', {
        body: { method: method, path: path, body: body != null ? body : null }
      });
      if (res.error) {
        var msg = res.error.message || String(res.error);
        if (/not found|404/i.test(msg)) {
          throw new Error('KS 프록시 Edge Function 미배포. Supabase Dashboard에서 ks-rentcar-proxy 함수를 배포하거나 GitHub Actions「Sync KS Lease」를 실행하세요.');
        }
        throw new Error(msg);
      }
      var data = res.data;
      if (data && data._purpleProxy) {
        var st = data.status || 200;
        var b = data.body || '';
        return {
          ok: st >= 200 && st < 400,
          status: st,
          text: async function () { return b; },
          json: async function () { return JSON.parse(b); },
          headers: { get: function () { return null; } }
        };
      }
      if (data && typeof data === 'object' && data.error) {
        throw new Error(data.error + (data.message ? ': ' + data.message : ''));
      }
      return {
        ok: true,
        status: 200,
        text: async function () {
          if (typeof data === 'string') return data;
          if (data == null) return '';
          return typeof data === 'object' ? JSON.stringify(data) : String(data);
        },
        json: async function () {
          if (typeof data === 'string') return JSON.parse(data);
          return data;
        },
        headers: { get: function () { return null; } }
      };
    }

    async function request(method, urlOrPath, body) {
      var path = urlOrPath;
      if (typeof path === 'string' && path.indexOf('http') === 0) {
        try {
          var parsed = new URL(path);
          if (parsed.searchParams.get('path')) {
            path = decodeURIComponent(parsed.searchParams.get('path') || '');
          }
        } catch (_) { /* keep */ }
      }
      if (typeof path === 'string' && path.indexOf('/') !== 0 && path.indexOf('http') !== 0) {
        path = '/' + path;
      }

      if (supabaseClient && getConfig().ksRentcarEdgeProxyUrl && typeof window !== 'undefined') {
        return invokeProxy(method, path, body);
      }
      if (!fetchFn) throw new Error('fetch 미지원 환경');

      var url = (typeof urlOrPath === 'string' && urlOrPath.indexOf('http') === 0)
        ? urlOrPath
        : buildKsUrl(path);

      var cfg = getConfig();
      var headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json, text/html, */*'
      };
      if (isEdgeProxyUrl(url) && cfg.anonKey) {
        headers.apikey = cfg.anonKey;
        headers.Authorization = 'Bearer ' + cfg.anonKey;
      }
      if (cookie) headers.Cookie = cookie;
      var opts = { method: method, headers: headers, credentials: isSameOriginKs(url) ? 'include' : 'omit' };
      if (body != null) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
        opts.body = body;
      }
      var res = await fetchFn(url, opts);
      var setCookie = res.headers.get && res.headers.get('set-cookie');
      if (setCookie) {
        cookie = setCookie.split(',').map(function (p) { return p.split(';')[0].trim(); }).join('; ');
      }
      return res;
    }

    return {
      warmSession: async function () {
        await request('GET', '/estimate');
      },
      getHtml: async function (path) {
        var res = await request('GET', path);
        if (!res.ok && res.status !== 200) throw new Error('KS HTTP ' + (res.status || 'error') + ' ' + path);
        return res.text();
      },
      postAjax: async function (mode, formBody) {
        var res = await request('POST', AJAX + mode, formBody);
        if (!res.ok && res.status !== 200) throw new Error('KS AJAX ' + mode + ' HTTP ' + (res.status || 'error'));
        var json = await res.json();
        if (!json || json.successYN !== 'Y') {
          throw new Error('KS AJAX ' + mode + ' 실패: ' + ((json && json.message) || 'unknown'));
        }
        return json;
      }
    };
  }

  function normalizeList(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    var out = [];
    Object.keys(data).forEach(function (k) { out.push(data[k]); });
    return out;
  }

  async function fetchBrands(http, country) {
    var param = ksCountryParam(country);
    var json = await http.postAjax('country', 'search[where][country]=' + encodeURIComponent(param));
    return normalizeList(json.data).filter(function (b) {
      return b && b.idx && String(b.statCode || 'normal') === 'normal';
    });
  }

  async function fetchModels(http, brandId) {
    var json = await http.postAjax('brand', 'input[brand]=' + encodeURIComponent(String(brandId)));
    return normalizeList(json.data).filter(function (m) {
      return m && m.idx && String(m.statCode || 'normal') === 'normal';
    });
  }

  async function fetchStep02Bundle(http, brandId, country, modelId) {
    var q = 'input%5Bbrand%5D=' + encodeURIComponent(String(brandId)) +
      '&input%5Bcountry%5D=' + encodeURIComponent(ksCountryParam(country)) +
      '&input%5Bmodel%5D=' + encodeURIComponent(String(modelId));
    var html = await http.getHtml('/estimate/step02?' + q);
    var param = extractJsObject(html, 'param') || { brand: String(brandId), country: ksCountryParam(country), model: String(modelId) };
    var optionMap = extractJsObject(html, 'option') || {};
    var trims = parseTrimsFromHtml(html);
    return { html: html, param: param, optionMap: optionMap, trims: trims };
  }

  async function fetchTrimExtras(http, modelId, trimId) {
    var body = 'input[model]=' + encodeURIComponent(String(modelId)) +
      '&input[trim]=' + encodeURIComponent(String(trimId));
    var trimJson = await http.postAjax('trim', body);
    var colorJson = await http.postAjax('color', body);
    var colors = (colorJson.data && colorJson.data.color) || {};
    return {
      innerColor: trimJson.innerColor || [],
      options: trimJson.data || [],
      colors: {
        in: colors.in || [],
        out: colors.out || []
      }
    };
  }

  function buildTrimConfig(trims, optionMap, extrasByTrim) {
    var rows = (trims || []).map(function (t) {
      var trimId = String(t.id);
      var extras = extrasByTrim[trimId] || {};
      var embeddedOpts = optionMap[trimId] || optionMap[parseInt(trimId, 10)] || [];
      if (!Array.isArray(embeddedOpts)) embeddedOpts = embeddedOpts ? [embeddedOpts] : [];
      var ajaxOpts = extras.options || [];
      if (!Array.isArray(ajaxOpts)) ajaxOpts = ajaxOpts ? Object.values(ajaxOpts) : [];
      var options = ajaxOpts.length ? ajaxOpts : embeddedOpts;
      var firstOpt = options[0] || embeddedOpts[0] || null;
      return {
        id: trimId,
        lineupId: t.lineupId || '',
        name: t.name || (firstOpt && firstOpt.trimName) || '',
        lineupName: t.lineupName || (firstOpt && firstOpt.lineupName) || '',
        basePriceMan: t.basePriceMan || 0,
        options: options.map(function (o) {
          return {
            idx: o.idx,
            name: decodeHtmlText(o.name || ''),
            priceWon: parseInt(o.price, 10) || 0,
            priceMan: Math.round((parseInt(o.price, 10) || 0) / 10000),
            code: o.code || '',
            overlapCode: o.overlapCode || '',
            trimId: o.trimId || trimId
          };
        }),
        colors: extras.colors || { in: [], out: [] },
        innerColors: extras.innerColor || []
      };
    });
    return rows.filter(isUsableTrimRow);
  }

  function mapBrandRow(ksBrand, country) {
    var ksId = parseInt(ksBrand.idx, 10);
    return {
      slug: slugify(ksBrand.name, 'b-' + ksId),
      name: ksBrand.name || '',
      origin: country,
      logo_url: absKsUrl('/data/dbrand/e' + ksId + '.png'),
      sort_order: parseInt(ksBrand.sort, 10) || ksId,
      is_active: true,
      ks_brand_id: ksId,
      sync_source: 'ks',
      last_synced_at: new Date().toISOString()
    };
  }

  function mapModelRow(ksModel, brandDbId, country, stepBundle, trimConfig) {
    var ksId = parseInt(ksModel.idx, 10);
    var minMan = wonToManStr(ksModel.minAmt);
    var maxMan = wonToManStr(ksModel.maxAmt);
    var brandId = ksModel.brandId || (stepBundle.param && stepBundle.param.brand) || '';
    var modelId = ksModel.idx;
    var sourceUrl = getBaseUrl() + '/estimate/step02?input%5Bbrand%5D=' + brandId +
      '&input%5Bcountry%5D=' + ksCountryParam(country) +
      '&input%5Bmodel%5D=' + modelId;

    return {
      brand_id: brandDbId,
      slug: slugify(ksModel.name, 'm-' + ksId),
      name: ksModel.name || '',
      price_from: minMan,
      price_to: maxMan || minMan,
      img_url: pickModelImage(ksModel),
      config_json: {
        ks: {
          brand_id: String(brandId),
          model_id: String(modelId),
          country: ksCountryParam(country),
          idxEnc: ksModel.idxEnc || '',
          minAmt: ksModel.minAmt || '',
          maxAmt: ksModel.maxAmt || ''
        },
        param: stepBundle.param || {},
        trims: trimConfig || []
      },
      sort_order: ksId,
      is_active: true,
      ks_model_id: ksId,
      sync_source: 'ks',
      sync_state: {},
      source_url: sourceUrl,
      last_synced_at: new Date().toISOString()
    };
  }

  function emptyResumeState() {
    return {
      mode: 'full',
      pending_brands: [],
      pending_models: [],
      synced_brand_ids: [],
      synced_model_ids: [],
      all_brand_ids: [],
      all_model_ids: [],
      errors: []
    };
  }

  function buildBrandScopeLabel(state, brandJobs, partialBrandSync) {
    var names = (brandJobs || []).map(function (b) { return b.name; }).filter(Boolean);
    if (partialBrandSync || state.mode === 'partial' || (state.selected_brand_ids && state.selected_brand_ids.length)) {
      if (names.length === 1) return names[0];
      if (names.length > 1) return names.join(', ');
      var n = (state.selected_brand_ids || []).length;
      return n ? ('브랜드 ' + n + '개') : '선택';
    }
    if (state.mode === 'resume') {
      if (names.length === 1) return names[0] + ' 재시도';
      if (names.length > 1) return names.join(', ') + ' 재시도';
      return '재시도';
    }
    return '전체';
  }

  async function runSync(dbClient, country, options) {
    var opts = options || {};
    var onProgress = opts.onProgress || function () {};
    var resume = !!opts.resume;
    var brandIdsFilter = uniqueInts(opts.brandIds || []);
    var partialBrandSync = brandIdsFilter.length > 0;
    var started = Date.now();
    var http = createHttp();
    var state = emptyResumeState();
    var stats = {
      brandsOk: 0,
      brandsFail: 0,
      modelsOk: 0,
      modelsFail: 0,
      inserted: 0,
      updated: 0,
      deactivated: 0,
      trimsFiltered: 0
    };

    if (opts.resumeState) {
      state = Object.assign(emptyResumeState(), opts.resumeState);
      resume = true;
    } else if (opts.resumeLogId && dbClient) {
      var logState = await loadResumeStateByLogId(dbClient, opts.resumeLogId);
      if (logState && logState.resume_state) {
        state = Object.assign(emptyResumeState(), logState.resume_state);
        resume = true;
      }
    } else if (resume && dbClient) {
      var lastLog = await loadLatestResumeState(dbClient, country);
      if (lastLog) state = Object.assign(emptyResumeState(), lastLog);
    }

    await http.warmSession();
    onProgress({ phase: 'session', country: country });

    var brandJobs = [];
    var modelJobs = [];

    if (resume && (state.pending_brands.length || state.pending_models.length)) {
      state.mode = 'resume';
      brandJobs = state.pending_brands.slice();
      modelJobs = state.pending_models.slice();
      onProgress({ phase: 'resume', brands: brandJobs.length, models: modelJobs.length });
    } else {
      state.mode = 'full';
      onProgress({ phase: 'brands', country: country });
      var brands;
      try {
        brands = await fetchBrands(http, country);
      } catch (err) {
        throw new Error('브랜드 목록 조회 실패: ' + (err.message || err));
      }
      brandJobs = brands.map(function (b) {
        return { ks_brand_id: parseInt(b.idx, 10), name: b.name, raw: b };
      });
      state.all_brand_ids = brandJobs.map(function (b) { return b.ks_brand_id; });
      if (partialBrandSync) {
        brandJobs = brandJobs.filter(function (b) {
          return brandIdsFilter.indexOf(b.ks_brand_id) >= 0;
        });
        state.selected_brand_ids = brandIdsFilter.slice();
        state.mode = 'partial';
        if (!brandJobs.length) {
          throw new Error('선택한 브랜드를 KS에서 찾을 수 없습니다.');
        }
      }
    }

    var brandIdToDb = {};
    var existingBrandsRes = await dbClient.from('lease_brands')
      .select('id,ks_brand_id,slug,admin_override,sync_source')
      .eq('origin', country);
    if (existingBrandsRes.error) throw existingBrandsRes.error;
    (existingBrandsRes.data || []).forEach(function (r) {
      if (r.ks_brand_id != null) brandIdToDb[r.ks_brand_id] = r;
    });

    var existingModelsRes = await dbClient.from('lease_models')
      .select('id,ks_model_id,brand_id,admin_override,sync_source')
      .eq('sync_source', 'ks');
    if (existingModelsRes.error) throw existingModelsRes.error;
    var existingModelMap = {};
    (existingModelsRes.data || []).forEach(function (r) {
      if (r.ks_model_id != null) existingModelMap[r.ks_model_id] = r;
    });

    var nextPendingBrands = [];
    var nextPendingModels = [];
    var allSyncedModelIds = (state.synced_model_ids || []).slice();
    var allSyncedBrandIds = (state.synced_brand_ids || []).slice();

    for (var bi = 0; bi < brandJobs.length; bi++) {
      var bjob = brandJobs[bi];
      var ksBrand = bjob.raw;
      if (!ksBrand) {
        try {
          var brandsAgain = await fetchBrands(http, country);
          ksBrand = brandsAgain.find(function (x) { return parseInt(x.idx, 10) === bjob.ks_brand_id; });
        } catch (err) {
          nextPendingBrands.push({ ks_brand_id: bjob.ks_brand_id, name: bjob.name, error: err.message || String(err) });
          stats.brandsFail++;
          continue;
        }
        if (!ksBrand) {
          nextPendingBrands.push({ ks_brand_id: bjob.ks_brand_id, name: bjob.name, error: '브랜드를 찾을 수 없음' });
          stats.brandsFail++;
          continue;
        }
      }

      onProgress({ phase: 'brand', index: bi + 1, total: brandJobs.length, name: ksBrand.name });

      var brandRow = mapBrandRow(ksBrand, country);
      var prevBrand = brandIdToDb[brandRow.ks_brand_id];
      if (prevBrand && prevBrand.admin_override) {
        brandIdToDb[brandRow.ks_brand_id] = prevBrand;
        allSyncedBrandIds.push(brandRow.ks_brand_id);
        stats.brandsOk++;
      } else {
        try {
          var brandResult = await upsertBrandRow(dbClient, brandRow);
          var savedBrand = brandResult.data;
          if (!savedBrand) throw new Error('브랜드 upsert 결과 없음');
          brandIdToDb[brandRow.ks_brand_id] = savedBrand;
          if (brandResult.inserted) stats.inserted++; else if (!brandResult.skipped) stats.updated++;
          allSyncedBrandIds.push(brandRow.ks_brand_id);
          stats.brandsOk++;
        } catch (err) {
          nextPendingBrands.push({ ks_brand_id: brandRow.ks_brand_id, name: ksBrand.name, error: err.message || String(err) });
          stats.brandsFail++;
          continue;
        }
      }

      var modelsForBrand = [];
      if (state.mode === 'resume' && modelJobs.length) {
        modelsForBrand = modelJobs.filter(function (m) {
          return parseInt(m.ks_brand_id, 10) === brandRow.ks_brand_id;
        });
      } else {
        try {
          var ksModels = await fetchModels(http, brandRow.ks_brand_id);
          modelsForBrand = ksModels.map(function (m) {
            return {
              ks_brand_id: brandRow.ks_brand_id,
              ks_model_id: parseInt(m.idx, 10),
              name: m.name,
              raw: m
            };
          });
          if (state.mode === 'full') {
            state.all_model_ids = (state.all_model_ids || []).concat(
              modelsForBrand.map(function (m) { return m.ks_model_id; })
            );
          }
        } catch (err) {
          nextPendingBrands.push({ ks_brand_id: brandRow.ks_brand_id, name: ksBrand.name, error: '모델목록: ' + (err.message || err) });
          stats.brandsFail++;
          continue;
        }
      }

      for (var mi = 0; mi < modelsForBrand.length; mi++) {
        var mjob = modelsForBrand[mi];
        var ksModel = mjob.raw;
        if (!ksModel) {
          try {
            var ksModelsRetry = await fetchModels(http, brandRow.ks_brand_id);
            ksModel = ksModelsRetry.find(function (x) { return parseInt(x.idx, 10) === mjob.ks_model_id; });
          } catch (err) {
            nextPendingModels.push({
              ks_brand_id: brandRow.ks_brand_id,
              ks_model_id: mjob.ks_model_id,
              name: mjob.name,
              error: err.message || String(err)
            });
            stats.modelsFail++;
            continue;
          }
          if (!ksModel) {
            nextPendingModels.push({
              ks_brand_id: brandRow.ks_brand_id,
              ks_model_id: mjob.ks_model_id,
              name: mjob.name,
              error: '모델을 찾을 수 없음'
            });
            stats.modelsFail++;
            continue;
          }
        }

        onProgress({
          phase: 'model',
          brand: ksBrand.name,
          index: mi + 1,
          total: modelsForBrand.length,
          name: ksModel.name
        });

        var prevModel = existingModelMap[mjob.ks_model_id];
        if (prevModel && prevModel.admin_override) {
          allSyncedModelIds.push(mjob.ks_model_id);
          stats.modelsOk++;
          continue;
        }

        try {
          var stepBundle = await fetchStep02Bundle(http, brandRow.ks_brand_id, country, ksModel.idx);
          var extrasByTrim = {};
          for (var ti = 0; ti < stepBundle.trims.length; ti++) {
            var trim = stepBundle.trims[ti];
            try {
              extrasByTrim[trim.id] = await fetchTrimExtras(http, ksModel.idx, trim.id);
            } catch (trimErr) {
              extrasByTrim[trim.id] = { innerColor: [], options: stepBundle.optionMap[trim.id] || [], colors: { in: [], out: [] } };
            }
          }
          var trimConfig = buildTrimConfig(stepBundle.trims, stepBundle.optionMap, extrasByTrim);
          stats.trimsFiltered += Math.max(0, (stepBundle.trims || []).length - trimConfig.length);
          var brandDb = brandIdToDb[brandRow.ks_brand_id];
          if (!brandDb || !brandDb.id) throw new Error('브랜드 DB ID 없음');

          var modelRow = mapModelRow(ksModel, brandDb.id, country, stepBundle, trimConfig);
          var modelResult = await upsertModelRow(dbClient, modelRow);
          if (modelResult.inserted) stats.inserted++;
          else if (!modelResult.skipped) stats.updated++;
          allSyncedModelIds.push(mjob.ks_model_id);
          stats.modelsOk++;
        } catch (err) {
          nextPendingModels.push({
            ks_brand_id: brandRow.ks_brand_id,
            ks_model_id: mjob.ks_model_id,
            name: ksModel.name,
            error: err.message || String(err)
          });
          stats.modelsFail++;
        }
      }
    }

    state.pending_brands = nextPendingBrands;
    state.pending_models = nextPendingModels;
    state.synced_brand_ids = uniqueInts(allSyncedBrandIds);
    state.synced_model_ids = uniqueInts(allSyncedModelIds);
    state.all_brand_ids = uniqueInts(state.all_brand_ids || []);
    state.all_model_ids = uniqueInts(state.all_model_ids || []);

    var complete = !nextPendingBrands.length && !nextPendingModels.length;
    if (complete && state.mode === 'full' && state.all_model_ids.length && !partialBrandSync) {
      onProgress({ phase: 'deactivate', country: country });
      stats.deactivated = await deactivateMissing(dbClient, country, state);
    }

    var durationMs = Date.now() - started;
    var ok = complete && stats.modelsFail === 0 && stats.brandsFail === 0;
    var msg = ok
      ? '동기화 완료'
      : (complete ? '일부 실패 후 완료' : '부분 완료 — 실패 항목은 다음 실행에서 이어집니다');

    var logRow = {
      country: country,
      ok: ok,
      msg: msg,
      diag: {
        mode: state.mode,
        brand_scope: buildBrandScopeLabel(state, brandJobs, partialBrandSync),
        brand_ids: state.selected_brand_ids || brandIdsFilter,
        brand_names: brandJobs.map(function (b) { return b.name; }),
        trims_filtered: stats.trimsFiltered,
        errors: nextPendingBrands.concat(nextPendingModels).map(function (e) {
          return { type: e.ks_model_id ? 'model' : 'brand', id: e.ks_model_id || e.ks_brand_id, name: e.name, error: e.error };
        })
      },
      resume_state: state,
      brands_ok: stats.brandsOk,
      brands_fail: stats.brandsFail,
      models_ok: stats.modelsOk,
      models_fail: stats.modelsFail,
      inserted: stats.inserted,
      updated: stats.updated,
      deactivated: stats.deactivated,
      duration_ms: durationMs,
      started_at: new Date(started).toISOString(),
      ended_at: new Date().toISOString()
    };

    if (dbClient) {
      var logIns = await dbClient.from('lease_sync_logs').insert([logRow]).select('id').single();
      if (logIns.error) console.warn('[KsLeaseSync] log insert:', logIns.error);
      logRow.id = logIns.data && logIns.data.id;
    }

    return {
      ok: ok,
      complete: complete,
      msg: msg,
      country: country,
      stats: stats,
      resumeState: state,
      logId: logRow.id,
      durationMs: durationMs,
      canResume: !complete
    };
  }

  function uniqueInts(arr) {
    var seen = {};
    var out = [];
    (arr || []).forEach(function (n) {
      var v = parseInt(n, 10);
      if (!v || seen[v]) return;
      seen[v] = true;
      out.push(v);
    });
    return out;
  }

  async function upsertBrandRow(dbClient, row) {
    var ex = await dbClient.from('lease_brands')
      .select('id,admin_override')
      .eq('ks_brand_id', row.ks_brand_id)
      .eq('origin', row.origin)
      .maybeSingle();
    if (ex.error) throw ex.error;
    if (ex.data) {
      if (ex.data.admin_override) return { data: ex.data, inserted: false, skipped: true };
      var up = await dbClient.from('lease_brands').update(row).eq('id', ex.data.id).select('id,ks_brand_id,slug,admin_override').single();
      if (up.error) throw up.error;
      return { data: up.data, inserted: false, skipped: false };
    }
    var ins = await dbClient.from('lease_brands').insert([row]).select('id,ks_brand_id,slug,admin_override').single();
    if (ins.error) throw ins.error;
    return { data: ins.data, inserted: true, skipped: false };
  }

  async function upsertModelRow(dbClient, row) {
    var ex = await dbClient.from('lease_models')
      .select('id,admin_override')
      .eq('ks_model_id', row.ks_model_id)
      .maybeSingle();
    if (ex.error) throw ex.error;
    if (ex.data) {
      if (ex.data.admin_override) return { inserted: false, skipped: true };
      var up = await dbClient.from('lease_models').update(row).eq('id', ex.data.id).select('id,ks_model_id').single();
      if (up.error) throw up.error;
      return { inserted: false, skipped: false };
    }
    var ins = await dbClient.from('lease_models').insert([row]).select('id,ks_model_id').single();
    if (ins.error) throw ins.error;
    return { inserted: true, skipped: false };
  }

  async function loadResumeStateByLogId(dbClient, logId) {
    var res = await dbClient.from('lease_sync_logs')
      .select('resume_state,country,ok,models_ok,models_fail')
      .eq('id', logId)
      .maybeSingle();
    if (res.error || !res.data) return null;
    return res.data;
  }

  async function loadLatestResumeState(dbClient, country) {
    var res = await dbClient.from('lease_sync_logs')
      .select('resume_state,ok')
      .eq('country', country)
      .order('started_at', { ascending: false })
      .limit(1);
    if (res.error || !res.data || !res.data[0]) return null;
    var st = res.data[0].resume_state || {};
    if (res.data[0].ok) return null;
    if (!st.pending_brands || !st.pending_brands.length) {
      if (!st.pending_models || !st.pending_models.length) return null;
    }
    return st;
  }

  async function deactivateMissing(dbClient, country, state) {
    var activeBrandIds = state.all_brand_ids || [];
    var activeModelIds = state.all_model_ids || [];
    var deactivated = 0;

    var brandRes = await dbClient.from('lease_brands')
      .select('id,ks_brand_id,admin_override')
      .eq('origin', country)
      .eq('sync_source', 'ks')
      .eq('is_active', true);
    if (brandRes.error) throw brandRes.error;
    var brandDeactivate = (brandRes.data || []).filter(function (r) {
      return !r.admin_override && activeBrandIds.indexOf(r.ks_brand_id) < 0;
    }).map(function (r) { return r.id; });
    if (brandDeactivate.length) {
      var bd = await dbClient.from('lease_brands').update({ is_active: false }).in('id', brandDeactivate);
      if (bd.error) throw bd.error;
      deactivated += brandDeactivate.length;
    }

    var brandIdsForCountry = (brandRes.data || []).map(function (b) { return b.id; });
    if (!brandIdsForCountry.length) return deactivated;

    var modelRes = await dbClient.from('lease_models')
      .select('id,ks_model_id,admin_override,brand_id')
      .eq('sync_source', 'ks')
      .eq('is_active', true)
      .in('brand_id', brandIdsForCountry);
    if (modelRes.error) throw modelRes.error;

    var modelDeactivate = (modelRes.data || []).filter(function (r) {
      return !r.admin_override && activeModelIds.indexOf(r.ks_model_id) < 0;
    }).map(function (r) { return r.id; });
    if (modelDeactivate.length) {
      var md = await dbClient.from('lease_models').update({ is_active: false }).in('id', modelDeactivate);
      if (md.error) throw md.error;
      deactivated += modelDeactivate.length;
    }
    return deactivated;
  }

  return {
    BASE: BASE,
    getBaseUrl: getBaseUrl,
    buildKsUrl: buildKsUrl,
    ksCountryParam: ksCountryParam,
    createHttp: createHttp,
    fetchBrands: fetchBrands,
    fetchModels: fetchModels,
    fetchStep02Bundle: fetchStep02Bundle,
    fetchTrimExtras: fetchTrimExtras,
    mapBrandRow: mapBrandRow,
    mapModelRow: mapModelRow,
    runSync: runSync,
    loadLatestResumeState: loadLatestResumeState,
    loadResumeStateByLogId: loadResumeStateByLogId
  };
}));
