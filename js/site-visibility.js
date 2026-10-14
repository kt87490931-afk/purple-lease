/**
 * 사이트 노출 설정 (site_visibility_settings) — 중고차 메뉴·섹션 숨김
 * <head> 안, supabase-config.js 다음에 로드해야 첫 화면부터 깜빡임 없이 적용됩니다.
 * 설정을 못 불러오면(테이블 없음·HTTP 오류) 기존처럼 노출 상태를 유지합니다.
 */
(function () {
  'use strict';

  var CACHE_KEY = 'pa_site_visibility_v1';
  var HIDE_CLASS = 'pa-hide-usedcar';
  var CHECK_CLASS = 'pa-vis-checking';
  var CHECK_TIMEOUT_MS = 2000;
  var USED_CAR_PATH_RE = /^\/used-car(s|-detail)(\.html)?\/?$/;

  var root = document.documentElement;

  function readCache() {
    try {
      var raw = window.localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeCache(usedCarVisible) {
    try {
      if (usedCarVisible) window.localStorage.removeItem(CACHE_KEY);
      else window.localStorage.setItem(CACHE_KEY, JSON.stringify({ used_car_visible: false }));
    } catch (e) { /* 저장 불가(사파리 개인정보 모드 등) — 무시 */ }
  }

  function injectStyle() {
    var css =
      'html.' + HIDE_CLASS + ' a[href^="/used-car"],' +
      'html.' + HIDE_CLASS + ' a[href^="used-car"],' +
      'html.' + HIDE_CLASS + ' a[href*="purpleauto.co.kr/used-car"],' +
      'html.' + HIDE_CLASS + ' #usedcars{display:none !important;}' +
      'html.' + CHECK_CLASS + ' body{visibility:hidden !important;}';
    var style = document.createElement('style');
    style.id = 'paSiteVisibilityStyle';
    style.textContent = css;
    (document.head || root).appendChild(style);
  }

  function isUsedCarPage() {
    return USED_CAR_PATH_RE.test(window.location.pathname || '');
  }

  function goHome() {
    window.location.replace('/');
  }

  function apply(usedCarVisible) {
    if (usedCarVisible) root.classList.remove(HIDE_CLASS);
    else root.classList.add(HIDE_CLASS);
  }

  /** @returns {Promise<boolean|null>} true/false = DB 값, null = 확인 실패(네트워크) */
  function fetchUsedCarVisible() {
    var cfg = window.SUPABASE_CONFIG;
    if (!cfg || !cfg.url || !cfg.anonKey || typeof fetch !== 'function') return Promise.resolve(true);
    var url = cfg.url.replace(/\/$/, '') + '/rest/v1/site_visibility_settings?id=eq.1&select=used_car_visible';
    return fetch(url, {
      headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey }
    }).then(function (res) {
      if (!res.ok) return true;
      return res.json().then(function (rows) {
        var row = rows && rows[0];
        return !(row && row.used_car_visible === false);
      });
    }).catch(function (e) {
      console.warn('[site-visibility]', e);
      return null;
    });
  }

  injectStyle();

  var cached = readCache();
  var cachedHidden = !!(cached && cached.used_car_visible === false);
  apply(!cachedHidden);

  var onUsedCarPage = isUsedCarPage();
  var settled = false;
  var timer = null;

  if (onUsedCarPage && cachedHidden) {
    root.classList.add(CHECK_CLASS);
    timer = setTimeout(function () {
      if (settled) return;
      settled = true;
      goHome();
    }, CHECK_TIMEOUT_MS);
  }

  var ready = fetchUsedCarVisible().then(function (visible) {
    var finalVisible = visible === null ? !cachedHidden : visible;
    if (visible !== null) writeCache(visible);
    apply(finalVisible);
    if (!settled) {
      settled = true;
      if (timer) clearTimeout(timer);
      if (onUsedCarPage && !finalVisible) {
        goHome();
      } else {
        root.classList.remove(CHECK_CLASS);
      }
    }
    return { used_car_visible: finalVisible };
  });

  window.PurpleSiteVisibility = {
    ready: ready,
    isUsedCarHidden: function () { return root.classList.contains(HIDE_CLASS); }
  };
})();
