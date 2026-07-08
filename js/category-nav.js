/**
 * category-nav — 계산기·신차견적 드롭다운 (모바일 포털 서브메뉴)
 */
(function () {
  'use strict';

  var docListenersBound = false;

  function getSubmenu(wrap) {
    return wrap._calcSubmenu || wrap.querySelector('.category-nav-submenu');
  }

  function restoreSubmenu(wrap) {
    var menu = wrap._calcSubmenu;
    if (!menu || !wrap._calcSubmenuPortaled) return;
    menu.classList.remove('category-nav-submenu--portal', 'is-open');
    menu.removeAttribute('style');
    wrap.appendChild(menu);
    wrap._calcSubmenuPortaled = false;
  }

  function closeAllDropdowns() {
    document.querySelectorAll('.category-nav-dropdown.open').forEach(function (wrap) {
      wrap.classList.remove('open');
      var btn = wrap.querySelector('.category-nav-trigger');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      restoreSubmenu(wrap);
    });
  }

  function positionPortalMenu(btn, menu) {
    var rect = btn.getBoundingClientRect();
    var menuWidth = Math.max(rect.width, 148);
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
    var btn = wrap.querySelector('.category-nav-trigger');
    var menu = getSubmenu(wrap);
    if (!btn || !menu) return;

    wrap._calcSubmenu = menu;

    if (!wrap._calcSubmenuPortaled) {
      menu.classList.add('category-nav-submenu--portal');
      document.body.appendChild(menu);
      wrap._calcSubmenuPortaled = true;
    }

    menu.classList.add('is-open');
    positionPortalMenu(btn, menu);
  }

  function bindDocumentListeners() {
    if (docListenersBound) return;
    docListenersBound = true;

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-calc-nav]') || e.target.closest('[data-estimate-nav]') || e.target.closest('.category-nav-submenu--portal')) return;
      closeAllDropdowns();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAllDropdowns();
    });

    window.addEventListener('resize', function () {
      document.querySelectorAll('.category-nav-dropdown.open').forEach(function (wrap) {
        var btn = wrap.querySelector('.category-nav-trigger');
        var menu = getSubmenu(wrap);
        if (btn && menu && menu.classList.contains('is-open')) {
          positionPortalMenu(btn, menu);
        }
      });
    });

    window.addEventListener('scroll', function () {
      document.querySelectorAll('.category-nav-dropdown.open').forEach(function (wrap) {
        var btn = wrap.querySelector('.category-nav-trigger');
        var menu = getSubmenu(wrap);
        if (btn && menu && menu.classList.contains('is-open')) {
          positionPortalMenu(btn, menu);
        }
      });
    }, true);
  }

  function initNavDropdowns(selector) {
    document.querySelectorAll(selector).forEach(function (wrap) {
      var btn = wrap.querySelector('.category-nav-trigger');
      if (!btn || btn.dataset.bound) return;
      btn.dataset.bound = '1';

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var isOpen = wrap.classList.contains('open');
        closeAllDropdowns();
        if (!isOpen) {
          wrap.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
          openSubmenu(wrap);
        }
      });
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
