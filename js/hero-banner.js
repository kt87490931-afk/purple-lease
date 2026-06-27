/**
 * 메인 히어로 배너 — Supabase hero_slides 동적 렌더 + 캐러셀
 */
(function () {
  'use strict';

  var FONT_SIZES = { xs: '10px', sm: '11px', md: '13.5px', base: '15px', lg: '26px', xl: '36px' };

  var FALLBACK_SLIDES = [
    {
      slide_type: 'builder',
      bg_image_url: '',
      kicker_text: '🎉 신규 가입 이벤트',
      title_text: '선납금 0원, 보증금 걱정 없는\n무보증 장기렌트 특가',
      desc_text: '퍼플오토와 함께라면 목돈 부담 없이 원하는 차를 탈 수 있습니다. 지금 바로 무료 견적을 받아보세요.',
      buttons: [
        { label: '무료 견적받기', href: '/estimate', style: 'primary' },
        { label: '타임특가 보기', href: '#timesale', style: 'outline' }
      ]
    },
    {
      slide_type: 'builder',
      bg_image_url: '',
      kicker_text: '🚗 승계매입 전문',
      title_text: '타고 있는 리스·렌트차,\n위약금 없이 승계하세요',
      desc_text: '오토리스·장기렌트 승계매입 전문업체 퍼플오토가 잔여 계약을 안전하게 인수해드립니다.',
      buttons: [
        { label: '승계 상담받기', href: '/estimate', style: 'primary' },
        { label: '중고매물 보기', href: '/used-cars', style: 'outline' }
      ]
    },
    {
      slide_type: 'builder',
      bg_image_url: '',
      kicker_text: '⚡ 5일 이내 출고',
      title_text: '기다림 없이 받는\n즉시출고 차량 모음',
      desc_text: '인기 모델 즉시출고 재고를 지금 확인하세요. 빠르게 타고 싶은 분께 추천합니다.',
      buttons: [{ label: '즉시출고 확인', href: '/estimate', style: 'primary' }]
    }
  ];

  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escAttr(s) {
    return escHtml(s).replace(/'/g, '&#39;');
  }

  function fontSize(key, fallback) {
    return FONT_SIZES[key] || FONT_SIZES[fallback] || FONT_SIZES.md;
  }

  function textStyle(sizeKey, color, fallbackSize) {
    var parts = ['font-size:' + fontSize(sizeKey, fallbackSize)];
    if (color) parts.push('color:' + color);
    return parts.join(';');
  }

  function alignClass(prefix, align) {
    var a = (align || 'left').toLowerCase();
    if (a === 'center' || a === 'right') return prefix + '-align-' + a;
    return prefix + '-align-left';
  }

  function nlToBr(text) {
    return escHtml(text).replace(/\n/g, '<br>');
  }

  function sanitizeHeroHtml(html) {
    return String(html || '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  }

  function normalizeButtons(raw) {
    if (!raw) return [];
    var list = Array.isArray(raw) ? raw : [];
    return list.map(function (b) {
      return {
        label: String((b && b.label) || '').trim(),
        href: String((b && b.href) || '#').trim() || '#',
        style: (b && b.style) === 'outline' ? 'outline' : 'primary'
      };
    }).filter(function (b) { return b.label; });
  }

  function renderButtons(buttons) {
    if (!buttons.length) return '';
    return '<div class="hero-cta-row">' + buttons.map(function (b) {
      var cls = b.style === 'outline' ? 'btn btn-outline' : 'btn btn-primary';
      return '<a href="' + escAttr(b.href) + '" class="' + cls + '">' + escHtml(b.label) + '</a>';
    }).join('') + '</div>';
  }

  function renderBuilderSlide(slide) {
    var buttons = normalizeButtons(slide.buttons);
    var innerAlign = alignClass('hero-inner', slide.title_align || slide.kicker_align || 'left');
    var kickerStyle = textStyle(slide.kicker_font_size, slide.kicker_color, 'sm');
    var titleStyle = textStyle(slide.title_font_size, slide.title_color || '#ffffff', 'lg');
    var descStyle = textStyle(slide.desc_font_size, slide.desc_color, 'md');
    var kickerAlign = slide.kicker_align ? 'text-align:' + slide.kicker_align + ';' : '';
    var titleAlign = slide.title_align ? 'text-align:' + slide.title_align + ';' : '';
    var descAlign = slide.desc_align ? 'text-align:' + slide.desc_align + ';' : '';

    var html = '<div class="wrap hero-slide-inner ' + innerAlign + '">';
    if (slide.kicker_text) {
      html += '<span class="hero-kicker" style="' + kickerStyle + ';' + kickerAlign + 'display:inline-flex;">' + escHtml(slide.kicker_text) + '</span>';
    }
    if (slide.title_text) {
      html += '<h1 style="' + titleStyle + ';' + titleAlign + '">' + nlToBr(slide.title_text) + '</h1>';
    }
    if (slide.desc_text) {
      html += '<p style="' + descStyle + ';' + descAlign + '">' + escHtml(slide.desc_text) + '</p>';
    }
    html += renderButtons(buttons) + '</div>';
    return html;
  }

  function renderHtmlSlide(slide) {
    var content = sanitizeHeroHtml(slide.html_content);
    if (!content) return '<div class="wrap hero-slide-inner hero-inner-align-left"><p style="color:#fff;">HTML 내용 없음</p></div>';
    return '<div class="hero-slide-html-inner">' + content + '</div>';
  }

  function renderSlideShell(slide, index) {
    var type = slide.slide_type === 'html' ? 'html' : 'builder';
    var bg = (slide.bg_image_url || '').trim();
    var overlay = Math.min(0.85, Math.max(0, parseFloat(slide.overlay_opacity)));
    if (isNaN(overlay)) overlay = 0.35;

    var cls = 'hero-slide hero-slide-' + type + (bg ? ' has-bg-image' : '');
    var html = '<div class="' + cls + '" data-hero-index="' + index + '">';
    if (bg) {
      html += '<div class="hero-slide-bg" style="background-image:url(' + escAttr(bg) + ')"></div>';
      html += '<div class="hero-slide-overlay" style="opacity:' + overlay + '"></div>';
    }
    html += type === 'html' ? renderHtmlSlide(slide) : renderBuilderSlide(slide);
    html += '</div>';
    return html;
  }

  function initCarousel(banner) {
    var track = banner.querySelector('#heroTrack');
    var dotsWrap = banner.querySelector('#heroDots');
    if (!track || !dotsWrap) return;

    var dots = dotsWrap.querySelectorAll('span');
    track.addEventListener('scroll', function () {
      var idx = Math.round(track.scrollLeft / track.clientWidth);
      dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
    });
    dots.forEach(function (d, i) {
      d.addEventListener('click', function () {
        track.scrollTo({ left: track.clientWidth * i, behavior: 'smooth' });
      });
    });

    if (dots.length <= 1) return;

    var autoIdx = 0;
    setInterval(function () {
      autoIdx = (autoIdx + 1) % dots.length;
      track.scrollTo({ left: track.clientWidth * autoIdx, behavior: 'smooth' });
    }, 5000);
  }

  function renderBanner(slides) {
    var banner = document.getElementById('heroBanner');
    if (!banner) return;

    if (!slides.length) {
      banner.style.display = 'none';
      return;
    }

    banner.style.display = '';
    var trackHtml = slides.map(function (s, i) { return renderSlideShell(s, i); }).join('');
    var dotsHtml = slides.map(function (_, i) {
      return '<span' + (i === 0 ? ' class="active"' : '') + '></span>';
    }).join('');

    banner.innerHTML =
      '<div class="hero-slide-track" id="heroTrack">' + trackHtml + '</div>' +
      '<div class="hero-dots" id="heroDots">' + dotsHtml + '</div>';

    initCarousel(banner);
  }

  async function fetchSlides() {
    var cfg = window.SUPABASE_CONFIG;
    if (!cfg || !cfg.url || !cfg.anonKey) return null;
    if (!window.supabase || !window.supabase.createClient) return null;
    var client = window.supabase.createClient(cfg.url, cfg.anonKey);
    var res = await client
      .from('hero_slides')
      .select('*')
      .eq('is_enabled', true)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })
      .limit(4);
    if (res.error) throw res.error;
    return res.data || [];
  }

  async function init() {
    var slides = null;
    try {
      slides = await fetchSlides();
    } catch (err) {
      console.warn('[HeroBanner] load failed, using fallback:', err);
    }
    if (!slides || !slides.length) slides = FALLBACK_SLIDES;
    renderBanner(slides);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
