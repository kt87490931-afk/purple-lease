(function () {
  'use strict';

  var docListenersBound = false;

  function closeAllCalcDropdowns() {
    document.querySelectorAll('.category-nav-dropdown.open').forEach(function (el) {
      el.classList.remove('open');
      var btn = el.querySelector('.category-nav-trigger');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      var menu = el.querySelector('.category-nav-submenu');
      if (menu) menu.removeAttribute('style');
    });
  }

  function positionSubmenu(wrap) {
    var btn = wrap.querySelector('.category-nav-trigger');
    var menu = wrap.querySelector('.category-nav-submenu');
    if (!btn || !menu) return;

    menu.style.position = 'fixed';
    menu.style.zIndex = '1200';
    menu.style.minWidth = '148px';

    var rect = btn.getBoundingClientRect();
    var menuWidth = Math.max(rect.width, 148);
    var left = rect.left;
    if (left + menuWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - menuWidth - 8);
    }

    menu.style.top = Math.round(rect.bottom) + 'px';
    menu.style.left = Math.round(left) + 'px';
    menu.style.right = 'auto';
  }

  function bindDocumentListeners() {
    if (docListenersBound) return;
    docListenersBound = true;

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-calc-nav]')) return;
      closeAllCalcDropdowns();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAllCalcDropdowns();
    });

    window.addEventListener('resize', function () {
      document.querySelectorAll('.category-nav-dropdown.open').forEach(positionSubmenu);
    });

    window.addEventListener('scroll', function () {
      document.querySelectorAll('.category-nav-dropdown.open').forEach(positionSubmenu);
    }, true);
  }

  function initCalcNavDropdowns() {
    document.querySelectorAll('[data-calc-nav]').forEach(function (wrap) {
      var btn = wrap.querySelector('.category-nav-trigger');
      if (!btn || btn.dataset.bound) return;
      btn.dataset.bound = '1';

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var isOpen = wrap.classList.contains('open');
        closeAllCalcDropdowns();
        if (!isOpen) {
          wrap.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
          positionSubmenu(wrap);
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

  function bootCategoryNav() {
    initCalcNavDropdowns();
    markActiveCalcSubmenu();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootCategoryNav);
  } else {
    bootCategoryNav();
  }
})();
