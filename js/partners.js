/**
 * 제휴업체 목록
 */
(function () {
  'use strict';

  var dataApi = window.PurplePartnersData;
  if (!dataApi) return;

  var sidoData = dataApi.getSidoData();
  var partnersData = dataApi.getPartners();
  var state = { sido: '', sigungu: '', tag: '', keyword: '' };

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function initTagChips() {
    var row = document.getElementById('partnerTagRow');
    if (!row) return;

    var allChip = document.createElement('button');
    allChip.type = 'button';
    allChip.className = 'partners-tag-chip active';
    allChip.textContent = '전체';
    allChip.dataset.tag = '';
    allChip.addEventListener('click', function () {
      row.querySelectorAll('.partners-tag-chip').forEach(function (c) { c.classList.remove('active'); });
      allChip.classList.add('active');
      state.tag = '';
      render();
    });
    row.appendChild(allChip);

    dataApi.getPartnerTags().forEach(function (tag) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'partners-tag-chip';
      chip.textContent = '#' + tag;
      chip.dataset.tag = tag;
      chip.addEventListener('click', function () {
        var isActive = chip.classList.contains('active');
        row.querySelectorAll('.partners-tag-chip').forEach(function (c) { c.classList.remove('active'); });
        if (isActive) {
          allChip.classList.add('active');
          state.tag = '';
        } else {
          chip.classList.add('active');
          state.tag = tag;
        }
        render();
      });
      row.appendChild(chip);
    });
  }

  function initSidoGrid() {
    var grid = document.getElementById('sidoGrid');
    if (!grid) return;

    var allChip = document.createElement('button');
    allChip.type = 'button';
    allChip.className = 'partners-sido-chip active';
    allChip.textContent = '전체';
    allChip.addEventListener('click', function () {
      grid.querySelectorAll('.partners-sido-chip').forEach(function (c) { c.classList.remove('active'); });
      allChip.classList.add('active');
      state.sido = '';
      state.sigungu = '';
      renderSigungu();
      render();
    });
    grid.appendChild(allChip);

    sidoData.forEach(function (s) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'partners-sido-chip';
      chip.textContent = s.name;
      chip.addEventListener('click', function () {
        var isActive = chip.classList.contains('active');
        grid.querySelectorAll('.partners-sido-chip').forEach(function (c) { c.classList.remove('active'); });
        if (isActive) {
          allChip.classList.add('active');
          state.sido = '';
          state.sigungu = '';
        } else {
          chip.classList.add('active');
          state.sido = s.name;
          state.sigungu = '';
        }
        renderSigungu();
        render();
      });
      grid.appendChild(chip);
    });
  }

  function renderSigungu() {
    var select = document.getElementById('sigunguSelect');
    if (!select) return;
    select.innerHTML = '<option value="">전체 지역에서 보기</option>';
    var matched = sidoData.find(function (s) { return s.name === state.sido; });
    if (matched) {
      matched.sigungu.forEach(function (g) {
        var opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        select.appendChild(opt);
      });
    }
  }

  function tagLabels(partner) {
    return (partner.tags || []).map(function (t) { return '#' + t; }).join(' ');
  }

  function render() {
    var grid = document.getElementById('partnerGrid');
    var resultCount = document.getElementById('resultCount');
    if (!grid || !resultCount) return;

    var filtered = partnersData.filter(function (p) {
      if (state.sido && p.region !== state.sido) return false;
      if (state.sigungu && p.sigungu !== state.sigungu) return false;
      if (state.tag && (!p.tags || p.tags.indexOf(state.tag) < 0)) return false;
      if (state.keyword) {
        var kw = state.keyword.toLowerCase();
        var tagStr = (p.tags || []).join(' ').toLowerCase();
        if (!(p.name.toLowerCase().indexOf(kw) >= 0 || p.desc.toLowerCase().indexOf(kw) >= 0 || tagStr.indexOf(kw) >= 0)) return false;
      }
      return true;
    });

    filtered.sort(function (a, b) {
      return (b.is_premium ? 1 : 0) - (a.is_premium ? 1 : 0);
    });

    resultCount.innerHTML = '전체 <b>' + filtered.length + '</b>개 업체';
    grid.innerHTML = '';

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="partners-empty">조건에 맞는 제휴업체가 없습니다. 필터를 변경해보세요.</div>';
      return;
    }

    filtered.forEach(function (p) {
      var thumbs = dataApi.listThumbUrls(p);
      var isVideo = thumbs.thumbnail_type === 'video';
      var mobileThumb = isVideo ? thumbs.video_thumb_url : thumbs.image_thumb_url;
      var primaryTag = (p.tags && p.tags[0]) ? p.tags[0] : '';

      var row = document.createElement('a');
      row.className = 'partner-row' + (p.is_premium ? ' is-premium' : '');
      row.href = '/partner-detail?id=' + p.id;

      row.innerHTML =
        '<div class="partner-thumb-pair">' +
          '<div class="partner-thumb-shell">' +
            '<img src="' + esc(thumbs.video_thumb_url) + '" alt="" loading="lazy">' +
            '<span class="partner-thumb-type-badge">▶ 영상</span>' +
            '<div class="partner-play-badge"></div>' +
          '</div>' +
          '<div class="partner-thumb-shell">' +
            '<img src="' + esc(thumbs.image_thumb_url) + '" alt="" loading="lazy">' +
            '<span class="partner-thumb-type-badge">📷 사진</span>' +
          '</div>' +
        '</div>' +
        '<div class="partner-thumb-shell mobile-only">' +
          '<img src="' + esc(mobileThumb) + '" alt="" loading="lazy">' +
          '<span class="partner-thumb-type-badge">' + (isVideo ? '▶ 영상' : '📷 사진') + '</span>' +
          (isVideo ? '<div class="partner-play-badge"></div>' : '') +
        '</div>' +
        '<div class="partner-row-body">' +
          '<div class="partner-row-top">' +
            (p.is_premium ? '<span class="partner-premium-badge" aria-hidden="true">👑</span>' : '') +
            '<span class="partner-row-name">' + esc(p.name) + '</span>' +
            (p.is_premium ? '<span class="partner-premium-flag">PREMIUM</span>' : '') +
            (primaryTag ? '<span class="partner-row-cat">#' + esc(primaryTag) + '</span>' : '') +
          '</div>' +
          '<div class="partner-row-desc">' + esc(p.desc) + '</div>' +
          '<div class="partner-row-meta">' +
            '<span><span class="ico" aria-hidden="true">📍</span>' + esc(p.address) + '</span>' +
            '<span><span class="ico" aria-hidden="true">☎</span>' + esc(p.phone) + '</span>' +
          '</div>' +
        '</div>' +
        '<span class="partner-row-arrow" aria-hidden="true">›</span>';

      grid.appendChild(row);
    });
  }

  function initIntroVideo() {
    var shell = document.getElementById('partnerIntroVideo');
    if (!shell) return;
    var settings = dataApi.getPageSettings();
    var titleEl = document.querySelector('.partners-video-title');
    var descEl = document.querySelector('.partners-video-desc');
    var thumbImg = shell.querySelector('img');
    if (titleEl && settings.title) titleEl.textContent = settings.title;
    if (descEl && settings.description) descEl.textContent = settings.description;
    if (thumbImg) {
      var ytId = dataApi.getIntroVideoId();
      thumbImg.src = settings.thumb_url || dataApi.youtubeThumbFromId(ytId);
    }
    var played = false;
    shell.addEventListener('click', function (e) {
      e.preventDefault();
      if (played) return;
      played = true;
      var embed = dataApi.youtubeEmbedUrl(dataApi.getIntroVideoId());
      shell.innerHTML = '<iframe src="' + embed + '" title="제휴업체 소개 영상" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
      shell.classList.add('is-playing');
    });
  }

  function bindFilters() {
    var sigunguSelect = document.getElementById('sigunguSelect');
    var keywordInput = document.getElementById('keywordInput');
    if (sigunguSelect) {
      sigunguSelect.addEventListener('change', function (e) {
        state.sigungu = e.target.value;
        render();
      });
    }
    if (keywordInput) {
      keywordInput.addEventListener('input', function (e) {
        state.keyword = e.target.value.trim();
        render();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    dataApi.ensureLoaded().then(function () {
      partnersData = dataApi.getPartners();
      initSidoGrid();
      initTagChips();
      renderSigungu();
      bindFilters();
      initIntroVideo();
      render();
    });
  });
})();
