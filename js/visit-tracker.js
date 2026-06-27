/**
 * 퍼플오토 공개 페이지 방문 수집 — Supabase visit_logs (GA 없음)
 */
(function () {
  'use strict';

  var VISITOR_KEY = 'purple_visitor_id';
  var TRACKED_KEY = 'purple_visit_tracked';

  function getVisitorId() {
    try {
      var id = localStorage.getItem(VISITOR_KEY);
      if (!id) {
        id = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(VISITOR_KEY, id);
      }
      return id;
    } catch (e) {
      return '';
    }
  }

  function normalizePath() {
    var path = window.location.pathname || '/';
    path = path.replace(/\.html$/i, '') || '/';
    if (path.length > 1 && path.charAt(path.length - 1) === '/') {
      path = path.slice(0, -1);
    }
    return path || '/';
  }

  function shouldSkip(path) {
    if (!path) return true;
    var lower = path.toLowerCase();
    if (lower.indexOf('/admin') === 0) return true;
    if (lower.indexOf('/mok/') === 0) return true;
    return false;
  }

  function detectVisitorType(ua) {
    var bot = /bot|crawler|spider|slurp|googlebot|bingbot|yandex|duckduckbot|baidu|facebookexternalhit|facebot|twitterbot|kakaotalk|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider/i;
    return bot.test(ua || '') ? 'bot' : 'visitor';
  }

  function trackVisit() {
    var cfg = window.SUPABASE_CONFIG;
    if (!cfg || !cfg.url || !cfg.anonKey) return;

    var path = normalizePath();
    if (shouldSkip(path)) return;

    var sessionKey = TRACKED_KEY + ':' + path;
    try {
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, '1');
    } catch (e) { /* ignore */ }

    var ua = navigator.userAgent || '';
    var touch = navigator.maxTouchPoints || 0;
    var deviceType = (window.PurpleDeviceType && window.PurpleDeviceType.detect)
      ? window.PurpleDeviceType.detect(ua, touch)
      : 'unknown';

    var payload = {
      path: path.substring(0, 500),
      user_agent: ua.substring(0, 500),
      visitor_type: detectVisitorType(ua),
      referrer: (document.referrer || '').substring(0, 2000) || null,
      visitor_id: getVisitorId() || null,
      device_type: deviceType
    };

    fetch(cfg.url + '/rest/v1/visit_logs', {
      method: 'POST',
      headers: {
        apikey: cfg.anonKey,
        Authorization: 'Bearer ' + cfg.anonKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(payload)
    }).catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackVisit);
  } else {
    trackVisit();
  }
})();
