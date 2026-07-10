/**
 * 완납승계 인수·판매 소개 페이지 — Supabase paid_transfer_page 연동
 */
(function () {
  'use strict';

  var DEFAULT_CONTENT = {
    eyebrow: 'About',
    headline_line1: '불편하고 비합리적인',
    headline_accent: '리스or장기렌트 매각 서비스',
    headline_line3: '혁신하기 위해 출발했습니다.',
    sub_copy: '리스나 렌트 중도해지 위약금이 너무 많다고?\n인증되지 않은 업체의 불합리한 감가가 고민이라면?\n퍼플오토와 함께해요!',
    cards: [
      { desc: '오직 고객님만을 위한 1:1 다이렉트 승계담당자 배정 후 모든 업무를 대행해드립니다.', title_main: '승계대행', title_accent: '시스템' },
      { desc: '중도해지 시 발생되는 위약금(패널티) 때문에 걱정이라면??', title_main: '비교견적', title_accent: '서비스' },
      { desc: '전국 12개의 제휴업체와 함께 전국 어디서든 편하게 차량검수를 받을 수 있습니다.', title_main: '방문검수', title_accent: '시스템' }
    ],
    cta_label: '더 알아보기',
    cta_url: '',
    cta_new_tab: false
  };

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function mergeContent(row) {
    var c = Object.assign({}, DEFAULT_CONTENT, row || {});
    if (!Array.isArray(c.cards) || !c.cards.length) {
      c.cards = DEFAULT_CONTENT.cards.slice();
    } else {
      c.cards = c.cards.map(function (card, i) {
        var def = DEFAULT_CONTENT.cards[i] || DEFAULT_CONTENT.cards[0];
        return Object.assign({}, def, card || {});
      });
    }
    return c;
  }

  async function fetchContent() {
    var cfg = window.SUPABASE_CONFIG;
    if (!cfg || !cfg.url || !cfg.anonKey) return mergeContent(null);
    try {
      var url = cfg.url.replace(/\/$/, '') + '/rest/v1/paid_transfer_page?id=eq.1&select=content_json';
      var res = await fetch(url, {
        headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey }
      });
      if (!res.ok) return mergeContent(null);
      var rows = await res.json();
      var raw = rows && rows[0] ? rows[0].content_json : null;
      return mergeContent(raw);
    } catch (e) {
      console.warn('[paid-transfer-page]', e);
      return mergeContent(null);
    }
  }

  function renderCards(cards) {
    return cards.map(function (card) {
      return (
        '<div class="pt-info-card">' +
          '<div class="desc">' + esc(card.desc) + '</div>' +
          '<div class="title">' + esc(card.title_main) + ' <span class="dot">' + esc(card.title_accent) + '</span></div>' +
        '</div>'
      );
    }).join('');
  }

  function renderCta(content) {
    var label = String(content.cta_label || '').trim() || '더 알아보기';
    var url = String(content.cta_url || '').trim();
    if (!url) {
      return '<button type="button" class="pt-cta-btn is-disabled" disabled>' + esc(label) + '</button>';
    }
    var target = content.cta_new_tab ? ' target="_blank" rel="noopener noreferrer"' : '';
    return '<a class="pt-cta-btn" href="' + esc(url) + '"' + target + '>' + esc(label) + '</a>';
  }

  function renderPage(content) {
    var root = document.getElementById('paidTransferRoot');
    if (!root) return;
    root.innerHTML =
      '<span class="pt-eyebrow">' + esc(content.eyebrow) + '</span>' +
      '<h1 class="pt-headline">' +
        esc(content.headline_line1) + '<br>' +
        '<span class="accent">' + esc(content.headline_accent) + '</span>를<br>' +
        esc(content.headline_line3) +
      '</h1>' +
      '<p class="pt-sub-copy">' + esc(content.sub_copy) + '</p>' +
      '<div class="pt-card-row">' + renderCards(content.cards) + '</div>' +
      '<div class="pt-cta-wrap">' + renderCta(content) + '</div>';
  }

  async function init() {
    var content = await fetchContent();
    renderPage(content);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
