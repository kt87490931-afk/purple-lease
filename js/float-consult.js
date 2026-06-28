/**
 * 플로팅 상담 FAB — Supabase float_consult_settings 연동
 */
(function () {
  'use strict';

  var FALLBACK = {
    is_enabled: true,
    phone_number: '1555-6362',
    kakao_url: 'https://pf.kakao.com/_vyvHG/chat',
    tel_label: '유선상담',
    kakao_label: '카카오상담',
    main_label: '상담',
    bottom_offset_mobile: 78,
    bottom_offset_desktop: 28
  };

  var PHONE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';

  var KAKAO_SVG = '<svg viewBox="0 0 24 24" fill="none">' +
    '<path fill-rule="evenodd" clip-rule="evenodd" d="M12 4.8C7.05 4.8 3 7.94 3 11.8c0 2.49 1.66 4.68 4.16 5.95l-1.06 3.81c-.09.33.27.6.57.42l4.39-2.84c.31.03.62.05.94.05 4.95 0 9-3.14 9-7C21 7.94 16.95 4.8 12 4.8z" fill="#181600"/></svg>';

  var MAIN_PHONE_SVG = '<svg class="icon-phone" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';

  var MAIN_X_SVG = '<svg class="icon-x" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round">' +
    '<line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>';

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function telHref(phone) {
    var digits = String(phone || '').replace(/[^\d+]/g, '');
    return digits ? 'tel:' + digits : 'tel:1555-6362';
  }

  function normalizeKakaoUrl(url) {
    var s = String(url || '').trim();
    if (!s) return FALLBACK.kakao_url;
    var m = s.match(/pf\.kakao\.com\/[^/?#]+(?:\/chat)?/i);
    if (m) {
      var path = m[0];
      if (path.indexOf('/chat') < 0) path += '/chat';
      return 'https://' + path.replace(/^https?:\/\//i, '');
    }
    return s;
  }

  function mergeSettings(row) {
    var cfg = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.floatConsultDefaults) || {};
    return Object.assign({}, FALLBACK, cfg, row || {});
  }

  async function fetchSettings() {
    var cfg = window.SUPABASE_CONFIG;
    if (!cfg || !cfg.url || !cfg.anonKey) return mergeSettings(null);
    try {
      var url = cfg.url.replace(/\/$/, '') + '/rest/v1/float_consult_settings?id=eq.1&select=*';
      var res = await fetch(url, {
        headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey }
      });
      if (!res.ok) return mergeSettings(null);
      var rows = await res.json();
      return mergeSettings(rows && rows[0] ? rows[0] : null);
    } catch (e) {
      console.warn('[float-consult]', e);
      return mergeSettings(null);
    }
  }

  function applyLayoutClasses(fab, settings) {
    fab.style.setProperty('--fab-bottom-mobile', (settings.bottom_offset_mobile || 78) + 'px');
    fab.style.setProperty('--fab-bottom-desktop', (settings.bottom_offset_desktop || 28) + 'px');

    if (document.querySelector('.mobile-cta')) {
      fab.classList.add('consult-fab--above-cta');
    } else if (!document.querySelector('.bottom-tabbar')) {
      fab.classList.add('consult-fab--no-tabbar');
    }
  }

  function renderFab(settings) {
    if (!settings.is_enabled) return;

    var tel = telHref(settings.phone_number);
    var kakao = normalizeKakaoUrl(settings.kakao_url);

    var wrap = document.createElement('div');
    wrap.className = 'consult-fab';
    wrap.id = 'consultFab';
    wrap.innerHTML =
      '<a href="' + esc(tel) + '" class="sub-btn tel" aria-label="' + esc(settings.tel_label) + '">' +
        PHONE_SVG + esc(settings.tel_label) +
      '</a>' +
      '<a href="' + esc(kakao) + '" target="_blank" rel="noopener noreferrer" class="sub-btn kakao" aria-label="' + esc(settings.kakao_label) + '">' +
        KAKAO_SVG + esc(settings.kakao_label) +
      '</a>' +
      '<button type="button" class="main-btn" id="mainFabBtn" aria-haspopup="true" aria-expanded="false" aria-label="상담 메뉴 열기/닫기">' +
        MAIN_PHONE_SVG + MAIN_X_SVG + esc(settings.main_label) +
      '</button>';

    document.body.appendChild(wrap);
    applyLayoutClasses(wrap, settings);

    var mainBtn = wrap.querySelector('#mainFabBtn');
    function toggle() {
      var isOpen = wrap.classList.toggle('open');
      mainBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
    function close() {
      wrap.classList.remove('open');
      mainBtn.setAttribute('aria-expanded', 'false');
    }

    mainBtn.addEventListener('click', toggle);
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  async function bootstrap() {
    if (document.body.dataset.noFloatConsult === '1') return;
    var settings = await fetchSettings();
    renderFab(settings);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
