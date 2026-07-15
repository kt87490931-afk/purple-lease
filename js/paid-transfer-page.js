/**
 * 완납승계 인수·판매 소개 페이지 — Supabase paid_transfer_page 연동
 * 상단 ABOUT + 하단 랜딩 섹션(추가) 렌더
 */
(function () {
  'use strict';

  var DEFAULT_BOTTOM = {
    service: {
      eyebrow: 'Main Service',
      heading: '이용중인 오토리스or장기렌트 반납하려니 위약금이 너무 크다면..',
      heading_accent: '퍼플오토 맞춤형 비교분석 컨설팅',
      side_eyebrow: '비교분석 컨설팅이란?',
      side_heading: '오토리스&장기렌트\n매각 컨설팅',
      side_copy: '승계자를 찾아 매각할 수 있는 제3자 승계, 감가상각부터 시간과 리스크 그리고 지원금까지.. 부담이 생길 수 밖에 없습니다.\n\n저희 **퍼플오토 맞춤형 비교분석 컨설팅**은 완납승계부터 인수 후 판매까지 이용자의 상황에 맞춘 비교분석 컨설팅을 통해 전 비용을 대납하고 모든 과정을 대행하여 승계종료까지 책임집니다.',
      image_url: 'https://picsum.photos/seed/purpleauto-consulting/800/600',
      image_alt: '상담 및 서류 작업'
    },
    zero: {
      eyebrow: '리스&렌트 판매 수수료는?',
      title: 'ZERO!',
      copy: '퍼플오토는 12곳의 제휴점에 매입대행 서비스를 제공, 고객님께서 계신 위치에서 차량 판매 시 발생될 수 있는 감가 방어를 도와드리며, 비교견적 판매대행 관련 모든 서비스는 **수수료는 0원**입니다.',
      image_url: 'https://picsum.photos/seed/purpleauto-zero/800/600',
      image_alt: '견적 계산 서류',
      trust_eyebrow: '퍼플오토는 여러분과 함께 하고 있습니다.',
      trust_image_url: 'https://picsum.photos/seed/purpleauto-trust/800/700',
      trust_image_alt: '신뢰와 약속',
      trust_items: [
        { desc: '거래과정 중 사고발생 시 모두 퍼플오토가 책임!', tag: '#안전성' },
        { desc: '수 많은 거래데이터를 기반으로 정확한 진행!', tag: '#전문성' },
        { desc: '12곳의 법인 제휴점으로 승계확정 후 보험해지까지!', tag: '#신뢰성' },
        { desc: '복잡하고 어려운 서류업무를 배정받은 담당자들이 대행하여 쉽고, 빠르게 진행!', tag: '#신속성' }
      ]
    },
    pain: {
      heading: '오토리스&장기렌트 처분에\n어려움을 겪고 계신가요?',
      sub_copy: '계약상품의 만기가 도래했거나, 중도해지를 하고 싶지만 위약금이 너무 높다면?\n인수 후 판매를 생각해도 잔존가치, 취등록비용, 보험비가 부담된다면?',
      sub_highlight: '퍼플오토와 함께하세요.',
      bars: [
        '약정주행거리가 초과되어 초과운행부담금이 발생하는 경우',
        '약정주행거리 대비 주행거리가 짧을 경우 (차량가치 평가가 높음)',
        '만기 시 잔존가치(인수금)을 낮게 측정한 경우 (차량시세가치가 높은 경우가 많음)',
        '운행 중인 차량의 사고가 많은 경우 (교환, 판금, 용접 등 부위별 가치감이 적용으로 인한 패널티가 높음)'
      ],
      footer_heading: '오토리스&장기렌트 매각\n일반승계와 다른점은?',
      footer_copy: '체계적인 시스템을 통해 12곳의 제휴점 모두 완납승계 진행이 가능하며 진행 시 미회수원금 패널티는 1~5%정도로 효율적인 판매가 가능합니다.'
    },
    compare_cards: [
      {
        tone: 'negative',
        title: '리스or렌트 일반승계 진행 시',
        image_url: 'https://picsum.photos/seed/purpleauto-compare1/500/400',
        image_alt: '일반승계 어려움',
        desc: '승계자가 나타날 때까지 기다려야 합니다. 조건변경이 불가하여 승계가 어렵습니다. 심사부결에 우려성이 높습니다. 기간소요가 큽니다.',
        result: '착수금(수수료)+감가상각비용+매달 리스료\n손실'
      },
      {
        tone: 'negative',
        title: '리스or렌트 반납 시 패널티',
        image_url: 'https://picsum.photos/seed/purpleauto-compare2/500/400',
        image_alt: '반납 패널티',
        desc: '계약기간 중도해지 시 패널티 발생은 기간별로 다르지만 29%~90% 발생합니다. 계약기간 만기 시 반납하여도 차량훼손위약금, 초과운행부담 등 위약금이 발생할 수 있습니다.',
        result: '차량가치평가 진행 시 중고차시세가\n더 높은 경우가 많습니다.'
      },
      {
        tone: 'positive',
        title: '퍼플오토 비교분석 컨설팅',
        image_url: 'https://picsum.photos/seed/purpleauto-compare3/500/400',
        image_alt: '퍼플오토 상담',
        desc: '불투명한 시세를 정확하게 파악하여 인수 진행 시 인수금 + 취등록비용을 선납해드립니다. 리스&렌트 계약상품에 따라 매각할 수 있는 방법이 다르기 때문에 비교분석 컨설팅을 통해 솔루션 제공을 받아보시기 바랍니다.',
        result: '거래의 투명성, 믿을 수 있는, 체계적인 시스템\n퍼플오토의 모토입니다.'
      }
    ],
    process: {
      eyebrow: '인수비용없이 승계와 완납을 한번에!',
      heading: '퍼플오토의 간단한\n리스&렌트 판매',
      steps: [
        {
          image_url: 'https://picsum.photos/seed/purpleauto-process1/500/400',
          image_alt: '24시간 상담',
          title: '24시간 편하게 이용할 수 있는 친절한 상담!',
          desc: '고객님의 기존계약 서류와 차량정보를 토대로 상황을 정확히 파악 후 비교 견적서를 발행 해드리고 맞춤형 컨설팅을 도와드립니다.'
        },
        {
          image_url: 'https://picsum.photos/seed/purpleauto-process2/500/400',
          image_alt: '1:1 담당자 배정',
          title: '1:1 다이렉트 승계담당자 배정',
          desc: '승계담당자 배정 후 계신 곳으로 직접 방문드려 실물실차 검수부터 모든 진행사항을 대행해 드립니다.'
        },
        {
          image_url: 'https://picsum.photos/seed/purpleauto-process3/500/400',
          image_alt: '완벽한 계약체결',
          title: '모든 진행과정을 대행, 완벽한 계약체결',
          desc: '경험이 많은 승계담당자의 승계접수부터 차량인도까지 고객님의 비용과 시간 모두 아껴드립니다.'
        }
      ]
    }
  };

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
    cta_label: '매각 상담신청하기',
    cta_url: '',
    cta_new_tab: false,
    bottom: DEFAULT_BOTTOM
  };

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function richText(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\n/g, '<br>');
  }

  function mergeObj(def, raw) {
    return Object.assign({}, def || {}, raw || {});
  }

  function mergeBottom(raw) {
    var b = raw && typeof raw === 'object' ? raw : {};
    var service = mergeObj(DEFAULT_BOTTOM.service, b.service);
    var zero = mergeObj(DEFAULT_BOTTOM.zero, b.zero);
    var pain = mergeObj(DEFAULT_BOTTOM.pain, b.pain);
    var process = mergeObj(DEFAULT_BOTTOM.process, b.process);

    zero.trust_items = Array.isArray(b.zero && b.zero.trust_items) && b.zero.trust_items.length
      ? b.zero.trust_items.slice(0, 4).map(function (item, i) {
          return mergeObj(DEFAULT_BOTTOM.zero.trust_items[i] || DEFAULT_BOTTOM.zero.trust_items[0], item);
        })
      : DEFAULT_BOTTOM.zero.trust_items.map(function (x) { return Object.assign({}, x); });
    while (zero.trust_items.length < 4) {
      zero.trust_items.push(Object.assign({}, DEFAULT_BOTTOM.zero.trust_items[zero.trust_items.length] || { desc: '', tag: '' }));
    }

    pain.bars = Array.isArray(b.pain && b.pain.bars) && b.pain.bars.length
      ? b.pain.bars.slice(0, 8).map(function (x) { return String(x || ''); })
      : DEFAULT_BOTTOM.pain.bars.slice();

    var compareCards = Array.isArray(b.compare_cards) && b.compare_cards.length
      ? b.compare_cards.slice(0, 3).map(function (card, i) {
          return mergeObj(DEFAULT_BOTTOM.compare_cards[i] || DEFAULT_BOTTOM.compare_cards[0], card);
        })
      : DEFAULT_BOTTOM.compare_cards.map(function (x) { return Object.assign({}, x); });
    while (compareCards.length < 3) {
      compareCards.push(Object.assign({}, DEFAULT_BOTTOM.compare_cards[compareCards.length] || DEFAULT_BOTTOM.compare_cards[0]));
    }

    process.steps = Array.isArray(b.process && b.process.steps) && b.process.steps.length
      ? b.process.steps.slice(0, 3).map(function (step, i) {
          return mergeObj(DEFAULT_BOTTOM.process.steps[i] || DEFAULT_BOTTOM.process.steps[0], step);
        })
      : DEFAULT_BOTTOM.process.steps.map(function (x) { return Object.assign({}, x); });
    while (process.steps.length < 3) {
      process.steps.push(Object.assign({}, DEFAULT_BOTTOM.process.steps[process.steps.length] || DEFAULT_BOTTOM.process.steps[0]));
    }

    return {
      service: service,
      zero: zero,
      pain: pain,
      compare_cards: compareCards,
      process: process
    };
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
    c.bottom = mergeBottom(c.bottom);
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
    var label = String(content.cta_label || '').trim() || '매각 상담신청하기';
    var url = String(content.cta_url || '').trim();
    if (!url) {
      return '<button type="button" class="pt-cta-btn is-disabled" disabled>' + esc(label) + '</button>';
    }
    var target = content.cta_new_tab ? ' target="_blank" rel="noopener noreferrer"' : '';
    return '<a class="pt-cta-btn" href="' + esc(url) + '"' + target + '>' + esc(label) + '</a>';
  }

  function imgTag(url, alt, cls) {
    var src = String(url || '').trim();
    if (!src) {
      return '<div class="' + (cls || 'rounded-img') + ' pt-img-placeholder" aria-hidden="true"></div>';
    }
    return '<img class="' + (cls || 'rounded-img') + '" src="' + esc(src) + '" alt="' + esc(alt || '') + '" loading="lazy">';
  }

  function renderBottom(bottom) {
    var s = bottom.service;
    var z = bottom.zero;
    var p = bottom.pain;
    var compare = bottom.compare_cards;
    var pr = bottom.process;

    var trustItems = (z.trust_items || []).map(function (item) {
      return (
        '<div class="trust-item">' +
          '<div class="desc">' + esc(item.desc) + '</div>' +
          '<div class="tag">' + esc(item.tag) + '</div>' +
        '</div>'
      );
    }).join('');

    var painBars = (p.bars || []).map(function (bar) {
      return '<div class="pain-bar">' + esc(bar) + '</div>';
    }).join('');

    var compareCards = (compare || []).map(function (card) {
      var tone = card.tone === 'positive' ? 'positive' : 'negative';
      return (
        '<div class="compare-card ' + tone + '">' +
          '<div class="card-title">' + esc(card.title) + '</div>' +
          '<div class="card-img">' + imgTag(card.image_url, card.image_alt, 'rounded-img') + '</div>' +
          '<div class="card-desc">' + esc(card.desc) + '</div>' +
          '<div class="card-result">' + richText(card.result) + '</div>' +
        '</div>'
      );
    }).join('');

    var steps = (pr.steps || []).map(function (step) {
      return (
        '<div class="process-item">' +
          '<div class="img-box">' + imgTag(step.image_url, step.image_alt, 'rounded-img') + '</div>' +
          '<div class="step-title">' + esc(step.title) + '</div>' +
          '<div class="desc">' + esc(step.desc) + '</div>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="pt-bottom-wrap">' +
        '<section class="pt-section">' +
          '<div class="pt-center">' +
            '<div class="pt-eyebrow">' + esc(s.eyebrow) + '</div>' +
            '<div class="pt-heading">' + richText(s.heading) + '<br><span class="accent">' + esc(s.heading_accent) + '</span></div>' +
          '</div>' +
          '<div class="two-col" style="margin-top:70px;">' +
            '<div>' +
              '<div class="pt-eyebrow">' + esc(s.side_eyebrow) + '</div>' +
              '<div class="pt-heading pt-heading-md">' + richText(s.side_heading) + '</div>' +
              '<div class="service-intro-copy">' + richText(s.side_copy) + '</div>' +
            '</div>' +
            '<div class="img-box">' + imgTag(s.image_url, s.image_alt, 'rounded-img') + '</div>' +
          '</div>' +
        '</section>' +

        '<section class="pt-section">' +
          '<div class="two-col">' +
            '<div class="img-box">' + imgTag(z.image_url, z.image_alt, 'rounded-img') + '</div>' +
            '<div>' +
              '<div class="pt-eyebrow">' + esc(z.eyebrow) + '</div>' +
              '<div class="zero-num">' + esc(z.title) + '</div>' +
              '<div class="service-intro-copy">' + richText(z.copy) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="two-col trust-block">' +
            '<div>' +
              '<div class="pt-eyebrow">' + esc(z.trust_eyebrow) + '</div>' +
              trustItems +
            '</div>' +
            '<div class="img-box">' + imgTag(z.trust_image_url, z.trust_image_alt, 'rounded-img') + '</div>' +
          '</div>' +
        '</section>' +

        '<section class="pt-section">' +
          '<div class="pain-head">' +
            '<div class="pt-heading pt-heading-md">' + richText(p.heading) + '</div>' +
            '<div class="sub-copy">' + richText(p.sub_copy) +
              (p.sub_highlight ? '<br><span class="highlight">' + esc(p.sub_highlight) + '</span>' : '') +
            '</div>' +
          '</div>' +
          painBars +
          '<div class="pain-footer">' +
            '<div class="pt-heading pt-heading-sm">' + richText(p.footer_heading) + '</div>' +
            '<div class="sub-copy">' + esc(p.footer_copy) + '</div>' +
          '</div>' +
        '</section>' +

        '<section class="pt-section">' +
          '<div class="compare-grid">' + compareCards + '</div>' +
        '</section>' +

        '<section class="pt-section">' +
          '<div class="pt-eyebrow">' + esc(pr.eyebrow) + '</div>' +
          '<div class="pt-heading">' + richText(pr.heading) + '</div>' +
          '<div class="process-grid">' + steps + '</div>' +
        '</section>' +
      '</div>'
    );
  }

  function renderHero(content) {
    return (
      '<section class="paid-transfer-section pt-hero">' +
        '<span class="pt-eyebrow">' + esc(content.eyebrow) + '</span>' +
        '<h1 class="pt-headline">' +
          esc(content.headline_line1) + '<br>' +
          '<span class="accent">' + esc(content.headline_accent) + '</span>를<br>' +
          esc(content.headline_line3) +
        '</h1>' +
        '<p class="pt-sub-copy">' + esc(content.sub_copy) + '</p>' +
        '<div class="pt-card-row">' + renderCards(content.cards) + '</div>' +
        '<div class="pt-cta-wrap">' + renderCta(content) + '</div>' +
      '</section>'
    );
  }

  function renderPage(content) {
    var root = document.getElementById('paidTransferRoot');
    if (!root) return;
    root.innerHTML = renderHero(content) + renderBottom(content.bottom || mergeBottom(null));
  }

  async function init() {
    if (!document.getElementById('paidTransferRoot')) return;
    var content = await fetchContent();
    renderPage(content);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.PurplePaidTransferPage = {
    DEFAULT_CONTENT: DEFAULT_CONTENT,
    DEFAULT_BOTTOM: DEFAULT_BOTTOM,
    mergeContent: mergeContent,
    mergeBottom: mergeBottom
  };
})();
