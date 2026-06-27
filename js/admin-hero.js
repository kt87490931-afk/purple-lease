/**
 * 어드민 — 히어로 배너 슬라이드 관리 (최대 4개)
 */
(function () {
  'use strict';

  var API = null;
  var heroSlides = [];
  var editingHeroId = null;

  var FONT_OPTS = [
    { v: 'xs', l: '아주 작게' },
    { v: 'sm', l: '작게' },
    { v: 'md', l: '보통' },
    { v: 'base', l: '기본' },
    { v: 'lg', l: '크게' },
    { v: 'xl', l: '아주 크게' }
  ];

  var ALIGN_OPTS = [
    { v: 'left', l: '왼쪽' },
    { v: 'center', l: '가운데' },
    { v: 'right', l: '오른쪽' }
  ];

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function showError(err) {
    alert((err && err.message) ? err.message : String(err));
  }

  function openModal(id) { document.getElementById(id).classList.add('open'); }
  function closeModal(id) { document.getElementById(id).classList.remove('open'); editingHeroId = null; }

  function fontSelect(id, val) {
    return '<select id="' + id + '" class="inline-edit-input" style="max-width:120px;">' +
      FONT_OPTS.map(function (o) {
        return '<option value="' + o.v + '"' + (val === o.v ? ' selected' : '') + '>' + o.l + '</option>';
      }).join('') + '</select>';
  }

  function alignSelect(id, val) {
    return '<select id="' + id + '" class="inline-edit-input" style="max-width:100px;">' +
      ALIGN_OPTS.map(function (o) {
        return '<option value="' + o.v + '"' + (val === o.v ? ' selected' : '') + '>' + o.l + '</option>';
      }).join('') + '</select>';
  }

  function slideTypeLabel(t) {
    return t === 'html' ? 'HTML' : '빌더';
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
      var label = (row.querySelector('.hero-btn-label') || {}).value;
      var href = (row.querySelector('.hero-btn-href') || {}).value;
      var style = (row.querySelector('.hero-btn-style') || {}).value;
      label = String(label || '').trim();
      if (!label) return;
      out.push({ label: label, href: String(href || '#').trim() || '#', style: style === 'outline' ? 'outline' : 'primary' });
    });
    return out;
  }

  function renderHeroButtonRows(buttons) {
    var wrap = document.getElementById('heroButtonsList');
    if (!wrap) return;
    var list = buttons && buttons.length ? buttons : [];
    if (!list.length) list = [{ label: '', href: '/estimate', style: 'primary' }];
    wrap.innerHTML = list.map(function (b, i) {
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
    renderHeroButtonRows(s.buttons || []);
    toggleHeroFormSections(document.getElementById('heroSlideType').value);
    updateHeroBgPreview();
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
  }

  function openHeroEditor(slide) {
    editingHeroId = slide ? slide.id : null;
    document.getElementById('modalHeroTitle').textContent = slide ? '슬라이드 편집' : '슬라이드 추가';
    fillHeroForm(slide || {});
    openModal('modalHero');
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
    });

    document.getElementById('heroBgImage').addEventListener('input', updateHeroBgPreview);

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
      renderHeroButtonRows(getHeroButtonsFromForm().concat([{ label: '', href: '/estimate', style: 'primary' }]));
    });

    document.getElementById('heroButtonsList').addEventListener('click', function (e) {
      if (e.target.classList.contains('hero-btn-remove')) {
        var row = e.target.closest('.hero-btn-row');
        if (row) row.remove();
      }
    });

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
