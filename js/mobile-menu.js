/**
 * 모바일 햄버거 전체 메뉴 + 하단 전화·카카오 (float_consult_settings 연동)
 */
(function () {
  'use strict';

  var MENU_ICON =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';

  var PHONE_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';

  var KAKAO_SVG =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path fill-rule="evenodd" clip-rule="evenodd" d="M12 4.8C7.05 4.8 3 7.94 3 11.8c0 2.49 1.66 4.68 4.16 5.95l-1.06 3.81c-.09.33.27.6.57.42l4.39-2.84c.31.03.62.05.94.05 4.95 0 9-3.14 9-7C21 7.94 16.95 4.8 12 4.8z" fill="currentColor"/></svg>';

  var NAV_ITEMS = [
    {
      label: '신차·리스·장기렌트카',
      match: /^\/(estimate|lease-transfer)/,
      children: [
        { href: '/estimate', label: '신차·리스·장기렌트카', match: /^\/estimate/ },
        { href: '/lease-transfers', label: '리스 · 장기렌트 일반승계', match: /^\/lease-transfer/ }
      ]
    },
    { href: '/used-cars', label: '중고차', match: /^\/used-cars/ },
    { href: '/parts-register', label: '수입차부품', match: /^\/parts-/ },
    { href: '/partners', label: '제휴업체', match: /^\/partners/ },
    {
      href: '/reviews-customer',
      label: '퍼플리뷰',
      match: /^\/(reviews-|review-detail)/,
      children: [
        { href: '/reviews-youtube', label: '퍼플오토 유튜브', match: /^\/reviews-youtube/ },
        { href: '/reviews-blog', label: '퍼플오토 블로그', match: /^\/reviews-blog/ },
        { href: '/reviews-customer', label: '고객후기', match: /^\/(reviews-customer|review-detail)/ }
      ]
    },
    {
      label: '내 차 월납입금 계산기',
      children: [
        { href: '/lease-calculator?tab=monthly', label: '월납입금계산', tab: 'monthly' },
        { href: '/lease-calculator?tab=rate', label: '리스렌트금리계산', tab: 'rate' }
      ]
    }
  ];

  var FALLBACK = {
    phone_number: '1555-6362',
    kakao_url: 'https://pf.kakao.com/_vyvHG/chat',
    tel_label: '유선상담',
    kakao_label: '카카오상담'
  };

  var drawerEl = null;
  var consultSettings = null;

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

  async function fetchConsultSettings() {
    if (consultSettings) return consultSettings;
    var cfg = window.SUPABASE_CONFIG;
    var merged = Object.assign({}, FALLBACK, (cfg && cfg.floatConsultDefaults) || {});
    if (!cfg || !cfg.url || !cfg.anonKey) {
      consultSettings = merged;
      return consultSettings;
    }
    try {
      var url = cfg.url.replace(/\/$/, '') + '/rest/v1/float_consult_settings?id=eq.1&select=*';
      var res = await fetch(url, {
        headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey }
      });
      if (res.ok) {
        var rows = await res.json();
        if (rows && rows[0]) merged = Object.assign(merged, rows[0]);
      }
    } catch (e) {
      console.warn('[mobile-menu]', e);
    }
    consultSettings = merged;
    return consultSettings;
  }

  function currentPath() {
    return window.location.pathname.replace(/\/$/, '') || '/';
  }

  function isActiveLink(item) {
    var path = currentPath();
    if (item.tab) {
      if (path !== '/lease-calculator') return false;
      var tab = new URLSearchParams(window.location.search).get('tab') || 'rate';
      return item.tab === tab;
    }
    if (item.match) {
      if (typeof item.match === 'function') return item.match(path);
      return item.match.test(path);
    }
    return path === String(item.href || '').split('?')[0].replace(/\/$/, '');
  }

  function buildMenuHtml() {
    var html = '';
    NAV_ITEMS.forEach(function (item) {
      if (item.children && item.children.length) {
        if (item.href) {
          html += '<a class="mobile-menu-link' + (isActiveLink(item) ? ' active' : '') + '" href="' + esc(item.href) + '">' + esc(item.label) + '</a>';
        } else {
          html += '<div class="mobile-menu-group-label">' + esc(item.label) + '</div>';
        }
        item.children.forEach(function (child) {
          html += '<a class="mobile-menu-sublink' + (isActiveLink(child) ? ' active' : '') + '" href="' + esc(child.href) + '">' + esc(child.label) + '</a>';
        });
        return;
      }
      html += '<a class="mobile-menu-link' + (isActiveLink(item) ? ' active' : '') + '" href="' + esc(item.href) + '">' + esc(item.label) + '</a>';
    });
    return html;
  }

  function refreshMenuList() {
    if (!drawerEl) return;
    var list = drawerEl.querySelector('.mobile-menu-list');
    if (list) list.innerHTML = buildMenuHtml();
  }

  function updateFooter(settings) {
    if (!drawerEl) return;
    var tel = drawerEl.querySelector('.mobile-menu-tel');
    var kakao = drawerEl.querySelector('.mobile-menu-kakao');
    if (tel) {
      tel.href = telHref(settings.phone_number);
      tel.innerHTML = PHONE_SVG + esc(settings.tel_label || FALLBACK.tel_label);
    }
    if (kakao) {
      kakao.href = normalizeKakaoUrl(settings.kakao_url);
      kakao.innerHTML = KAKAO_SVG + esc(settings.kakao_label || FALLBACK.kakao_label);
    }
  }

  function ensureDrawer() {
    if (drawerEl) return drawerEl;
    drawerEl = document.createElement('div');
    drawerEl.id = 'mobileMenuDrawer';
    drawerEl.className = 'mobile-menu-drawer';
    drawerEl.hidden = true;
    drawerEl.setAttribute('aria-hidden', 'true');
    drawerEl.innerHTML =
      '<div class="mobile-menu-backdrop" data-mobile-menu-close></div>' +
      '<div class="mobile-menu-panel" role="dialog" aria-modal="true" aria-label="전체 메뉴">' +
        '<div class="mobile-menu-head">' +
          '<span class="mobile-menu-title">전체 메뉴</span>' +
          '<button type="button" class="mobile-menu-close" data-mobile-menu-close aria-label="닫기">&times;</button>' +
        '</div>' +
        '<nav class="mobile-menu-list" aria-label="사이트 메뉴"></nav>' +
        '<div class="mobile-menu-foot">' +
          '<a class="mobile-menu-tel" href="' + esc(telHref(FALLBACK.phone_number)) + '">' + PHONE_SVG + esc(FALLBACK.tel_label) + '</a>' +
          '<a class="mobile-menu-kakao" href="' + esc(FALLBACK.kakao_url) + '" target="_blank" rel="noopener noreferrer">' + KAKAO_SVG + esc(FALLBACK.kakao_label) + '</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(drawerEl);

    drawerEl.querySelectorAll('[data-mobile-menu-close]').forEach(function (el) {
      el.addEventListener('click', closeDrawer);
    });

    refreshMenuList();
    fetchConsultSettings().then(updateFooter);
    return drawerEl;
  }

  function setTriggerExpanded(open) {
    document.querySelectorAll('[data-mobile-menu-open]').forEach(function (btn) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  function openDrawer() {
    var drawer = ensureDrawer();
    refreshMenuList();
    drawer.hidden = false;
    drawer.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () {
      drawer.classList.add('is-open');
    });
    document.body.style.overflow = 'hidden';
    setTriggerExpanded(true);
    var closeBtn = drawer.querySelector('.mobile-menu-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeDrawer() {
    if (!drawerEl) return;
    drawerEl.classList.remove('is-open');
    drawerEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTriggerExpanded(false);
    setTimeout(function () {
      if (drawerEl && !drawerEl.classList.contains('is-open')) {
        drawerEl.hidden = true;
      }
    }, 240);
  }

  function toggleDrawer(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (drawerEl && drawerEl.classList.contains('is-open')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }

  function setupTrigger() {
    var inner = document.querySelector('.site-header .header-inner');
    if (!inner) return;

    var trigger = inner.querySelector('[data-mobile-menu-open]');
    if (!trigger) {
      var legacy = inner.querySelector('.icon-btn[aria-label="메뉴"]');
      if (legacy) {
        legacy.setAttribute('data-mobile-menu-open', '');
        legacy.setAttribute('aria-controls', 'mobileMenuDrawer');
        legacy.setAttribute('aria-expanded', 'false');
        if (!legacy.classList.contains('mobile-menu-trigger')) {
          legacy.classList.add('mobile-menu-trigger');
        }
        trigger = legacy;
      }
    }

    if (!trigger) {
      var call = inner.querySelector('.header-call');
      if (!call) return;

      var actions = inner.querySelector('.header-actions');
      if (!actions) {
        var flexWrap = call.parentElement;
        if (flexWrap && flexWrap !== inner && flexWrap.querySelector('.header-call') === call && !flexWrap.classList.contains('logo')) {
          actions = flexWrap;
          actions.classList.add('header-actions');
        } else {
          actions = document.createElement('div');
          actions.className = 'header-actions';
          call.parentNode.insertBefore(actions, call);
          actions.appendChild(call);
        }
      }

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mobile-menu-trigger';
      btn.setAttribute('data-mobile-menu-open', '');
      btn.setAttribute('aria-label', '전체 메뉴');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', 'mobileMenuDrawer');
      btn.innerHTML = MENU_ICON;
      actions.appendChild(btn);
      trigger = btn;
    }

    if (trigger.dataset.mobileMenuBound) return;
    trigger.dataset.mobileMenuBound = '1';
    trigger.addEventListener('click', toggleDrawer);
  }

  function bindGlobal() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  function boot() {
    if (!document.querySelector('.site-header')) return;
    setupTrigger();
    bindGlobal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
