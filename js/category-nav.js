/**
 * category-nav — 계산기·신차견적 드롭다운 (모바일 포털 서브메뉴)
 */
(function () {
  'use strict';

  var docListenersBound = false;
  var ignoreOutsideClickUntil = 0;

  function getTrigger(wrap) {
    return wrap.querySelector('.category-nav-trigger');
  }

  function getSubmenu(wrap) {
    if (wrap._navSubmenu && document.contains(wrap._navSubmenu)) {
      return wrap._navSubmenu;
    }
    var menu = wrap.querySelector('.category-nav-submenu');
    wrap._navSubmenu = menu;
    return menu;
  }

  function restoreSubmenu(wrap) {
    var menu = wrap._navSubmenu;
    if (!menu || !wrap._navSubmenuPortaled) return;
    menu.classList.remove('category-nav-submenu--portal', 'is-open');
    menu.removeAttribute('style');
    wrap.appendChild(menu);
    wrap._navSubmenuPortaled = false;
  }

  function closeAllDropdowns() {
    document.querySelectorAll('.category-nav-dropdown').forEach(function (wrap) {
      wrap.classList.remove('open');
      var btn = getTrigger(wrap);
      if (btn) btn.setAttribute('aria-expanded', 'false');
      restoreSubmenu(wrap);
    });
  }

  function isInsideNavUi(target) {
    if (!target || !target.closest) return false;
    return !!(
      target.closest('[data-calc-nav]') ||
      target.closest('[data-estimate-nav]') ||
      target.closest('.category-nav-submenu--portal')
    );
  }

  function positionPortalMenu(btn, menu) {
    var rect = btn.getBoundingClientRect();
    var menuWidth = Math.max(rect.width, 168);
    var left = rect.left;
    if (left + menuWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - menuWidth - 8);
    }

    menu.style.top = Math.round(rect.bottom) + 'px';
    menu.style.left = Math.round(left) + 'px';
    menu.style.right = 'auto';
    menu.style.minWidth = Math.round(menuWidth) + 'px';
  }

  function openSubmenu(wrap) {
    var btn = getTrigger(wrap);
    var menu = getSubmenu(wrap);
    if (!btn || !menu) return;

    wrap._navSubmenu = menu;

    if (!wrap._navSubmenuPortaled) {
      menu.classList.add('category-nav-submenu--portal');
      document.body.appendChild(menu);
      wrap._navSubmenuPortaled = true;
    }

    menu.classList.add('is-open');
    positionPortalMenu(btn, menu);

    requestAnimationFrame(function () {
      positionPortalMenu(btn, menu);
    });
  }

  function bindDocumentListeners() {
    if (docListenersBound) return;
    docListenersBound = true;

    document.addEventListener('click', function (e) {
      if (Date.now() < ignoreOutsideClickUntil) return;
      if (isInsideNavUi(e.target)) return;
      closeAllDropdowns();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAllDropdowns();
    });

    window.addEventListener('resize', function () {
      document.querySelectorAll('.category-nav-dropdown.open').forEach(function (wrap) {
        var btn = getTrigger(wrap);
        var menu = getSubmenu(wrap);
        if (btn && menu && menu.classList.contains('is-open')) {
          positionPortalMenu(btn, menu);
        }
      });
    });

    window.addEventListener('scroll', function () {
      document.querySelectorAll('.category-nav-dropdown.open').forEach(function (wrap) {
        var btn = getTrigger(wrap);
        var menu = getSubmenu(wrap);
        if (btn && menu && menu.classList.contains('is-open')) {
          positionPortalMenu(btn, menu);
        }
      });
    }, true);
  }

  function toggleDropdown(wrap, btn) {
    var isOpen = wrap.classList.contains('open');
    closeAllDropdowns();
    if (!isOpen) {
      ignoreOutsideClickUntil = Date.now() + 80;
      wrap.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      openSubmenu(wrap);
    }
  }

  function initNavDropdowns(selector) {
    document.querySelectorAll(selector).forEach(function (wrap) {
      var btn = getTrigger(wrap);
      if (!btn || btn.dataset.navBound) return;
      btn.dataset.navBound = '1';

      function onTriggerActivate(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleDropdown(wrap, btn);
      }

      btn.addEventListener('click', onTriggerActivate);

      var menu = getSubmenu(wrap);
      if (menu) {
        menu.addEventListener('click', function () {
          closeAllDropdowns();
        });
      }
    });

    bindDocumentListeners();
  }

  function markActiveCalcSubmenu() {
    var path = window.location.pathname.replace(/\/$/, '');
    if (!path.endsWith('/lease-calculator') && path !== '/lease-calculator') return;

    var params = new URLSearchParams(window.location.search);
    var tab = params.get('tab') || 'rate';

    document.querySelectorAll('.category-nav-submenu a[data-calc-link]').forEach(function (a) {
      a.classList.toggle('active', a.dataset.calcLink === tab);
    });
    document.querySelectorAll('[data-calc-nav]').forEach(function (wrap) {
      wrap.classList.add('active');
    });
  }

  function markActiveEstimateSubmenu() {
    var path = window.location.pathname.replace(/\/$/, '');
    var isEstimate = path === '/estimate' || path.endsWith('/estimate');
    var isTransfer = path === '/lease-transfers' || path.endsWith('/lease-transfers') ||
      path === '/lease-transfer-detail' || path.endsWith('/lease-transfer-detail');
    if (!isEstimate && !isTransfer) return;

    var linkKey = isTransfer ? 'transfer' : 'main';
    document.querySelectorAll('.category-nav-submenu a[data-estimate-link]').forEach(function (a) {
      a.classList.toggle('active', a.dataset.estimateLink === linkKey);
    });
    document.querySelectorAll('[data-estimate-nav]').forEach(function (wrap) {
      wrap.classList.add('active');
    });
  }

  function bootCategoryNav() {
    initNavDropdowns('[data-calc-nav]');
    initNavDropdowns('[data-estimate-nav]');
    markActiveCalcSubmenu();
    markActiveEstimateSubmenu();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootCategoryNav);
  } else {
    bootCategoryNav();
  }
})();
