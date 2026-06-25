/**
 * 메인 로고 5회 클릭 → 어드민 로그인 페이지 이동
 * (index.html 전용 — 일반 1회 클릭은 홈으로 이동)
 */
(function () {
  'use strict';

  var logo = document.querySelector('header .logo.logo-gate, header a.logo');
  if (!logo) return;

  var clickCount = 0;
  var resetTimer = null;
  var singleClickTimer = null;

  logo.addEventListener('click', function (e) {
    clickCount += 1;
    clearTimeout(resetTimer);
    clearTimeout(singleClickTimer);

    resetTimer = setTimeout(function () {
      clickCount = 0;
    }, 3000);

    if (clickCount >= 5) {
      e.preventDefault();
      clickCount = 0;
      window.location.href = '/admin-login.html';
      return;
    }

    if (clickCount === 1) {
      e.preventDefault();
      singleClickTimer = setTimeout(function () {
        if (clickCount === 1) {
          clickCount = 0;
          window.location.href = logo.getAttribute('href') || 'index.html';
        }
      }, 400);
    } else {
      e.preventDefault();
    }
  });
})();
