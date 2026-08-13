/**
 * 어드민 — 히어로 배너 슬라이드 관리 (최대 4개)
 * 버튼 9구역 위치(PC·모바일 공통) + 간단 미리보기
 */
(function () {
  'use strict';

  var API = null;
  var heroSlides = [];
  var editingHeroId = null;
  var previewMode = 'pc';

  var FONT_SIZES = { xs: '10px', sm: '11px', md: '13.5px', base: '15px', lg: '26px', xl: '36px' };
  var CTA_ZONE_OPTIONS = [];
  for (var zi = 1; zi <= 15; zi++) {
    CTA_ZONE_OPTIONS.push({ value: String(zi), label: String(zi) });
  }
  var CTA_ZONE_LEGACY = {
    'top-left': '1', top: '3', 'top-right': '5',
    left: '6', center: '8', right: '10',
    'bottom-left': '11', bottom: '13', 'bottom-right': '15'
  };

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function showError(err) {
    alert((err && err.message) ? err.message : String(err));
  }

  function openModal(id) { document.getElementById(id).classList.add('open'); }
  function closeModal(id) { document.getElementById(id).classList.remove('open'); editingHeroId = null; }

  function slideTypeLabel(t) {
    return t === 'html' ? 'HTML' : '빌더';
  }

  function normalizeZone(zone) {
    var z = String(zone || '').trim();
    if (CTA_ZONE_LEGACY[z]) z = CTA_ZONE_LEGACY[z];
    var n = parseInt(z, 10);
    if (!isNaN(n) && n >= 1 && n <= 15) return String(n);
    return '11';
  }

  function getSelectedCtaZone() {
    var checked = document.querySelector('input[name="heroCtaZone"]:checked');
    return normalizeZone(checked && checked.value);
  }

  function setSelectedCtaZone(zone) {
    var z = normalizeZone(zone);
    document.querySelectorAll('input[name="heroCtaZone"]').forEach(function (el) {
      el.checked = el.value === z;
      if (el.parentElement) el.parentElement.classList.toggle('is-active', el.checked);
    });
  }

  function renderHeroList() {
    var body = document.getElementById('heroSlideList');
    var countEl = document.getElementById('heroSlideCount');
    var addBtn = document.getElementById('btnAddHeroSlide');
    if (!body) return;

    var max = (API && API.HERO_MAX_SLIDES) || 4;
    if (countEl) countEl.textContent = heroSlides.length;
    if (addBtn) addBtn.disabled = heroSlides.length >= max;

    if (!heroSlides.length) {
      body.innerHTML = '<p style="padding:24px;color:var(--ink-400);font-size:13px;">등록된 슬라이드가 없습니다. 「+ 슬라이드 추가」로 메인 히어로를 구성하세요.</p>';
      return;
    }

    body.innerHTML = heroSlides.map(function (s, idx) {
      var thumb = s.bg_image_url
        ? '<img src="' + esc(s.bg_image_url) + '" alt="" style="width:72px;height:48px;object-fit:cover;border-radius:6px;">'
        : '<span style="display:inline-block;width:72px;height:48px;border-radius:6px;background:var(--grad-main);"></span>';
      var title = s.slide_type === 'html'
        ? '(HTML 슬라이드)'
        : (s.title_text || s.kicker_text || '제목 없음').split('\n')[0];
      return '<div class="hero-admin-card" data-hero-id="' + s.id + '">' +
        '<div class="hero-admin-card-top">' +
        thumb +
        '<div class="hero-admin-card-meta">' +
        '<b>#' + (idx + 1) + ' ' + esc(title.slice(0, 40)) + '</b>' +
        '<span>' + slideTypeLabel(s.slide_type) + ' · ' + (s.is_enabled ? '노출' : '숨김') + '</span>' +
        '</div>' +
        '<div class="hero-admin-card-actions">' +
        '<button type="button" class="btn btn-outline btn-sm" data-hero-up="' + s.id + '"' + (idx === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" class="btn btn-outline btn-sm" data-hero-down="' + s.id + '"' + (idx === heroSlides.length - 1 ? ' disabled' : '') + '>↓</button>' +
        '<button type="button" class="btn btn-outline btn-sm" data-hero-edit="' + s.id + '">편집</button>' +
        '<button type="button" class="btn btn-danger-text btn-sm" data-hero-del="' + s.id + '">삭제</button>' +
        '</div></div></div>';
    }).join('');
  }

  function getHeroButtonsFromForm() {
    var rows = document.querySelectorAll('#heroButtonsList .hero-btn-row');
    var out = [];
    rows.forEach(function (row) {
      var label = String((row.querySelector('.hero-btn-label') || {}).value || '').trim();
      if (!label) return;
      var href = (row.querySelector('.hero-btn-href') || {}).value;
      var style = (row.querySelector('.hero-btn-style') || {}).value;
      out.push({
        label: label,
        href: String(href || '#').trim() || '#',
        style: style === 'outline' ? 'outline' : 'primary'
      });
    });
    return out;
  }

  function renderHeroButtonRows(buttons) {
    var wrap = document.getElementById('heroButtonsList');
    if (!wrap) return;
    var list = buttons && buttons.length ? buttons : [];
    if (!list.length) list = [{ label: '', href: '/estimate', style: 'primary' }];
    wrap.innerHTML = list.map(function (b) {
      return '<div class="hero-btn-row">' +
        '<input type="text" class="inline-edit-input hero-btn-label" placeholder="버튼 문구" value="' + esc(b.label) + '">' +
        '<input type="text" class="inline-edit-input hero-btn-href" placeholder="링크 (/estimate)" value="' + esc(b.href) + '">' +
        '<select class="inline-edit-input hero-btn-style" style="max-width:100px;">' +
        '<option value="primary"' + (b.style !== 'outline' ? ' selected' : '') + '>Primary</option>' +
        '<option value="outline"' + (b.style === 'outline' ? ' selected' : '') + '>Outline</option>' +
        '</select>' +
        '<button type="button" class="btn btn-danger-text btn-sm hero-btn-remove">삭제</button>' +
        '</div>';
    }).join('');
    updateHeroPreview();
  }

  function toggleHeroFormSections(type) {
    var isHtml = type === 'html';
    document.querySelectorAll('.hero-builder-fields').forEach(function (el) {
      el.style.display = isHtml ? 'none' : '';
    });
    document.querySelectorAll('.hero-html-fields').forEach(function (el) {
      el.style.display = isHtml ? '' : 'none';
    });
  }

  function fillHeroForm(slide) {
    var s = slide || {};
    document.getElementById('heroSlideType').value = s.slide_type === 'html' ? 'html' : 'builder';
    document.getElementById('heroEnabled').checked = s.is_enabled !== false;
    document.getElementById('heroBgImage').value = s.bg_image_url || '';
    document.getElementById('heroOverlay').value = s.overlay_opacity != null ? s.overlay_opacity : 0.35;
    document.getElementById('heroKicker').value = s.kicker_text || '';
    document.getElementById('heroKickerSize').value = s.kicker_font_size || 'sm';
    document.getElementById('heroKickerColor').value = s.kicker_color || '#ffffff';
    document.getElementById('heroKickerAlign').value = s.kicker_align || 'left';
    document.getElementById('heroTitle').value = s.title_text || '';
    document.getElementById('heroTitleSize').value = s.title_font_size || 'lg';
    document.getElementById('heroTitleColor').value = s.title_color || '#ffffff';
    document.getElementById('heroTitleAlign').value = s.title_align || 'left';
    document.getElementById('heroDesc').value = s.desc_text || '';
    document.getElementById('heroDescSize').value = s.desc_font_size || 'md';
    document.getElementById('heroDescColor').value = s.desc_color || '#ffffff';
    document.getElementById('heroDescAlign').value = s.desc_align || 'left';
    document.getElementById('heroHtmlContent').value = s.html_content || '';
    setSelectedCtaZone(s.cta_zone || (s.buttons && s.buttons[0] && s.buttons[0].zone) || '11');
    renderHeroButtonRows(s.buttons || []);
    toggleHeroFormSections(document.getElementById('heroSlideType').value);
    updateHeroBgPreview();
    setPreviewMode(previewMode || 'pc');
  }

  function updateHeroBgPreview() {
    var img = document.getElementById('heroBgPreview');
    var url = (document.getElementById('heroBgImage') || {}).value.trim();
    if (!img) return;
    if (url) {
      img.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
      img.hidden = false;
    } else {
      img.hidden = true;
      img.removeAttribute('src');
    }
    updateHeroPreview();
  }

  function setPreviewMode(mode) {
    previewMode = mode === 'mobile' ? 'mobile' : 'pc';
    document.querySelectorAll('[data-hero-preview-mode]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-hero-preview-mode') === previewMode);
    });
    var hint = document.getElementById('heroPreviewHint');
    if (hint) {
      hint.textContent = '버튼 위치는 15구역(3×5) 중 하나를 선택합니다. PC·모바일에 동일 적용되며 히어로 세로 길이는 변하지 않습니다.';
    }
    updateHeroPreview();
  }

  function fontSizeCss(key, fallback) {
    return FONT_SIZES[key] || FONT_SIZES[fallback] || FONT_SIZES.md;
  }

  function updateHeroPreview() {
    var frame = document.getElementById('heroPreviewFrame');
    if (!frame) return;
    if ((document.getElementById('heroSlideType') || {}).value === 'html') {
      frame.innerHTML = '<div class="hero-preview-wrap"><p style="margin:0;opacity:.85;font-size:12px;">HTML 슬라이드는 코드 미리보기를 지원하지 않습니다.</p></div>';
      frame.classList.toggle('is-pc', previewMode === 'pc');
      frame.classList.toggle('is-mobile', previewMode === 'mobile');
      return;
    }

    var bg = (document.getElementById('heroBgImage') || {}).value.trim();
    var overlay = parseFloat((document.getElementById('heroOverlay') || {}).value);
    if (isNaN(overlay)) overlay = 0.35;
    var kicker = (document.getElementById('heroKicker') || {}).value;
    var title = (document.getElementById('heroTitle') || {}).value;
    var desc = (document.getElementById('heroDesc') || {}).value;
    var kickerSize = (document.getElementById('heroKickerSize') || {}).value;
    var kickerColor = (document.getElementById('heroKickerColor') || {}).value.trim() || '#ffffff';
    var kickerAlign = (document.getElementById('heroKickerAlign') || {}).value || 'left';
    var titleSize = (document.getElementById('heroTitleSize') || {}).value;
    var titleColor = (document.getElementById('heroTitleColor') || {}).value.trim() || '#ffffff';
    var titleAlign = (document.getElementById('heroTitleAlign') || {}).value || 'left';
    var descSize = (document.getElementById('heroDescSize') || {}).value;
    var descColor = (document.getElementById('heroDescColor') || {}).value.trim() || '#ffffff';
    var descAlign = (document.getElementById('heroDescAlign') || {}).value || 'left';
    var buttons = getHeroButtonsFromForm();
    var zone = getSelectedCtaZone();

    frame.classList.toggle('is-pc', previewMode === 'pc');
    frame.classList.toggle('is-mobile', previewMode === 'mobile');

    var html = '';
    if (bg) {
      html += '<div class="hero-preview-bg" style="background-image:url(\'' + esc(bg).replace(/'/g, '%27') + '\')"></div>';
      html += '<div class="hero-preview-overlay" style="opacity:' + overlay + '"></div>';
    }
    html += '<div class="hero-preview-wrap" style="text-align:' + esc(titleAlign) + ';">';
    if (kicker) {
      html += '<span class="hero-preview-kicker" style="font-size:' + fontSizeCss(kickerSize, 'sm') + ';color:' + esc(kickerColor) + ';text-align:' + esc(kickerAlign) + ';">' + esc(kicker) + '</span>';
    }
    if (title) {
      html += '<div class="hero-preview-title" style="font-size:' + fontSizeCss(titleSize, 'lg') + ';color:' + esc(titleColor) + ';text-align:' + esc(titleAlign) + ';">' + esc(title) + '</div>';
    }
    if (desc) {
      html += '<p class="hero-preview-desc" style="font-size:' + fontSizeCss(descSize, 'md') + ';color:' + esc(descColor) + ';text-align:' + esc(descAlign) + ';">' + esc(desc) + '</p>';
    }
    html += '</div>';
    if (buttons.length) {
      html += '<div class="hero-preview-cta-dock hero-preview-cta-dock--' + zone + '"><div class="hero-preview-cta-flow">';
      buttons.forEach(function (b) {
        html += '<span class="hero-preview-btn ' + (b.style === 'outline' ? 'outline' : 'primary') + '">' + esc(b.label || '버튼') + '</span>';
      });
      html += '</div></div>';
    }
    frame.innerHTML = html;
  }

  function openHeroEditor(slide) {
    editingHeroId = slide ? slide.id : null;
    document.getElementById('modalHeroTitle').textContent = slide ? '슬라이드 편집' : '슬라이드 추가';
    fillHeroForm(slide || {});
    openModal('modalHero');
    setTimeout(updateHeroPreview, 30);
  }

  function collectHeroPayload() {
    return {
      is_enabled: document.getElementById('heroEnabled').checked,
      slide_type: document.getElementById('heroSlideType').value,
      bg_image_url: document.getElementById('heroBgImage').value.trim(),
      overlay_opacity: parseFloat(document.getElementById('heroOverlay').value) || 0.35,
      kicker_text: document.getElementById('heroKicker').value,
      kicker_font_size: document.getElementById('heroKickerSize').value,
      kicker_color: document.getElementById('heroKickerColor').value.trim(),
      kicker_align: document.getElementById('heroKickerAlign').value,
      title_text: document.getElementById('heroTitle').value,
      title_font_size: document.getElementById('heroTitleSize').value,
      title_color: document.getElementById('heroTitleColor').value.trim(),
      title_align: document.getElementById('heroTitleAlign').value,
      desc_text: document.getElementById('heroDesc').value,
      desc_font_size: document.getElementById('heroDescSize').value,
      desc_color: document.getElementById('heroDescColor').value.trim(),
      desc_align: document.getElementById('heroDescAlign').value,
      cta_zone: getSelectedCtaZone(),
      buttons: getHeroButtonsFromForm(),
      html_content: document.getElementById('heroHtmlContent').value
    };
  }

  async function loadHeroPanel() {
    heroSlides = await API.listHeroSlides();
    renderHeroList();
  }

  async function moveHeroSlide(id, dir) {
    var idx = heroSlides.findIndex(function (s) { return s.id === id; });
    if (idx < 0) return;
    var next = idx + dir;
    if (next < 0 || next >= heroSlides.length) return;
    var copy = heroSlides.slice();
    var tmp = copy[idx];
    copy[idx] = copy[next];
    copy[next] = tmp;
    await API.reorderHeroSlides(copy.map(function (s) { return s.id; }));
    await loadHeroPanel();
  }

  function bindHeroEvents() {
    var panel = document.getElementById('panel-hero');
    if (!panel) return;

    document.getElementById('btnAddHeroSlide').addEventListener('click', function () {
      var max = API.HERO_MAX_SLIDES || 4;
      if (heroSlides.length >= max) {
        alert('슬라이드는 최대 ' + max + '개까지 등록할 수 있습니다.');
        return;
      }
      openHeroEditor(null);
    });

    panel.addEventListener('click', async function (e) {
      var editId = e.target.closest('[data-hero-edit]');
      if (editId) {
        var s = heroSlides.find(function (x) { return x.id === parseInt(editId.dataset.heroEdit, 10); });
        if (s) openHeroEditor(s);
        return;
      }
      var delId = e.target.closest('[data-hero-del]');
      if (delId) {
        var id = parseInt(delId.dataset.heroDel, 10);
        if (!confirm('이 슬라이드를 삭제할까요?')) return;
        try {
          await API.deleteHeroSlide(id);
          await loadHeroPanel();
        } catch (err) { showError(err); }
        return;
      }
      var up = e.target.closest('[data-hero-up]');
      if (up) {
        try { await moveHeroSlide(parseInt(up.dataset.heroUp, 10), -1); } catch (err) { showError(err); }
        return;
      }
      var down = e.target.closest('[data-hero-down]');
      if (down) {
        try { await moveHeroSlide(parseInt(down.dataset.heroDown, 10), 1); } catch (err) { showError(err); }
      }
    });

    document.getElementById('heroSlideType').addEventListener('change', function () {
      toggleHeroFormSections(this.value);
      updateHeroPreview();
    });

    ['heroBgImage', 'heroOverlay', 'heroKicker', 'heroKickerSize', 'heroKickerColor', 'heroKickerAlign',
      'heroTitle', 'heroTitleSize', 'heroTitleColor', 'heroTitleAlign',
      'heroDesc', 'heroDescSize', 'heroDescColor', 'heroDescAlign'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', updateHeroPreview);
      el.addEventListener('change', updateHeroPreview);
    });

    document.getElementById('btnUploadHeroBg').addEventListener('click', async function () {
      var fileInput = document.getElementById('heroBgFile');
      if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        alert('배경 이미지 파일을 선택하세요.');
        return;
      }
      try {
        var url = await API.uploadImage(fileInput.files[0], 'hero');
        document.getElementById('heroBgImage').value = url;
        fileInput.value = '';
        updateHeroBgPreview();
      } catch (err) { showError(err); }
    });

    document.getElementById('btnAddHeroButton').addEventListener('click', function () {
      var list = getHeroButtonsFromForm();
      list.push({ label: '', href: '/estimate', style: 'primary' });
      renderHeroButtonRows(list);
    });

    document.getElementById('heroButtonsList').addEventListener('click', function (e) {
      if (e.target.classList.contains('hero-btn-remove')) {
        var row = e.target.closest('.hero-btn-row');
        if (row) row.remove();
        updateHeroPreview();
      }
    });

    document.getElementById('heroButtonsList').addEventListener('input', updateHeroPreview);
    document.getElementById('heroButtonsList').addEventListener('change', updateHeroPreview);

    document.querySelectorAll('[data-hero-preview-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setPreviewMode(btn.getAttribute('data-hero-preview-mode'));
      });
    });

    var zoneWrap = document.getElementById('heroCtaZoneGrid');
    if (zoneWrap) {
      zoneWrap.addEventListener('change', function () {
        document.querySelectorAll('input[name="heroCtaZone"]').forEach(function (el) {
          if (el.parentElement) el.parentElement.classList.toggle('is-active', el.checked);
        });
        updateHeroPreview();
      });
    }

    document.getElementById('heroHtmlFile').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        document.getElementById('heroHtmlContent').value = String(reader.result || '');
      };
      reader.readAsText(f, 'UTF-8');
      this.value = '';
    });

    document.getElementById('btnSaveHero').addEventListener('click', async function () {
      try {
        await API.saveHeroSlide(collectHeroPayload(), editingHeroId);
        closeModal('modalHero');
        await loadHeroPanel();
        alert('저장되었습니다. 메인 페이지를 새로고침하면 반영됩니다.');
      } catch (err) { showError(err); }
    });
  }

  function init(api) {
    API = api;
    bindHeroEvents();
  }

  window.PurpleAdminHero = {
    init: init,
    load: loadHeroPanel
  };
})();
