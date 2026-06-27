/**
 * 퍼플리스 어드민 UI — admin.html 전용
 */
(function () {
  'use strict';

  var API = null;
  var editingId = null;
  var youtubeData = [];
  var blogData = [];
  var reviewData = [];
  var partsData = [];
  var usedcarsData = [];
  var inquiryData = [];
  var inquiryUnread = 0;
  var inquiryTotal = 0;
  var leaseQuoteData = [];
  var leaseQuoteUnread = 0;
  var usedCarInquiryData = [];
  var usedCarInquiryUnread = 0;
  var activeInquiryTab = 'general';
  var leaseBrands = [];
  var selectedLeaseBrand = null;
  var lastKsSyncCountry = null;
  var lastKsSyncCanResume = false;
  var pendingKsSyncCountry = null;

  var pendingPartListingId = null;

  var analyticsTab = 'daily';
  var analyticsDays = 30;
  var analyticsMonth = '';
  var analyticsLoaded = false;
  var todayVisitorCount = 0;

  function parsePartPhotoLines(text) {
    return String(text || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function appendPartPhotoUrls(urls) {
    var ta = document.getElementById('partPhotos');
    var existing = parsePartPhotoLines(ta.value);
    ta.value = existing.concat(urls).join('\n');
  }

  function showError(err) {
    alert((err && err.message) ? err.message : String(err));
  }

  async function bindUpload(fileInputId, textInputId, folder) {
    var fileInput = document.getElementById(fileInputId);
    if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
    try {
      var url = await API.uploadImage(fileInput.files[0], folder);
      document.getElementById(textInputId).value = url;
      fileInput.value = '';
      alert('이미지가 업로드되었습니다.');
    } catch (err) {
      showError(err);
    }
  }

  function openModal(id) { document.getElementById(id).classList.add('open'); }
  function closeModal(id) { document.getElementById(id).classList.remove('open'); editingId = null; }

  function updateKpis() {
    var kpiInquiry = document.getElementById('kpiInquiry');
    if (kpiInquiry) kpiInquiry.textContent = inquiryTotal;
    var kpiTodayVisitors = document.getElementById('kpiTodayVisitors');
    if (kpiTodayVisitors) {
      kpiTodayVisitors.textContent = todayVisitorCount == null
        ? '—'
        : fmtAnalyticsNum(todayVisitorCount);
    }
    document.getElementById('kpiYoutube').textContent = youtubeData.length;
    document.getElementById('kpiBlog').textContent = blogData.length;
    document.getElementById('kpiReview').textContent = reviewData.length;
    document.getElementById('kpiParts').textContent = partsData.length;
    document.getElementById('kpiUsedcars').textContent = usedcarsData.length;
  }

  function updateInquiryNavBadge(totalUnread) {
    var badge = document.getElementById('inquiryNavBadge');
    if (!badge) return;
    var n = Math.max(0, parseInt(totalUnread, 10) || 0);
    if (n >= 1) {
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.style.display = 'inline-flex';
      badge.hidden = false;
    } else {
      badge.textContent = '';
      badge.style.display = 'none';
      badge.hidden = true;
    }
  }

  function updateTabBadge(elId, count) {
    var el = document.getElementById(elId);
    if (!el) return;
    var n = Math.max(0, parseInt(count, 10) || 0);
    if (n >= 1) {
      el.textContent = n > 99 ? '99+' : String(n);
      el.classList.add('show');
    } else {
      el.textContent = '';
      el.classList.remove('show');
    }
  }

  function updateInquiryTabBadges() {
    updateTabBadge('inquiryTabBadgeGeneral', inquiryUnread);
    updateTabBadge('inquiryTabBadgeNewcar', leaseQuoteUnread);
    updateTabBadge('inquiryTabBadgeUsedcar', usedCarInquiryUnread);
    updateInquiryNavBadge(inquiryUnread + leaseQuoteUnread + usedCarInquiryUnread);
  }

  function setActiveInquiryTab(tab) {
    activeInquiryTab = tab;
    document.querySelectorAll('.inquiry-tab').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.inquiryTab === tab);
    });
    document.querySelectorAll('.inquiry-tab-panel').forEach(function (panel) {
      panel.classList.remove('active');
    });
    var panelId = tab === 'general' ? 'inquiryTabGeneral' : (tab === 'newcar' ? 'inquiryTabNewcar' : 'inquiryTabUsedcar');
    var panel = document.getElementById(panelId);
    if (panel) panel.classList.add('active');
  }

  async function refreshUnifiedInquiryBadge() {
    try {
      inquiryUnread = await API.countUnreadInquiries();
      leaseQuoteUnread = await API.countUnreadLeaseQuotes();
      usedCarInquiryUnread = await API.countUnreadUsedCarInquiries();
      updateInquiryTabBadges();
    } catch (err) {
      console.warn('[Admin] inquiry badge:', err);
    }
  }

  function updateInquiryBadge(count) {
    inquiryUnread = Math.max(0, parseInt(count, 10) || 0);
    updateInquiryTabBadges();
  }

  function renderInquiriesTable() {
    var body = document.getElementById('inquiryTableBody');
    var countEl = document.getElementById('inquiryCount');
    if (countEl) countEl.textContent = inquiryData.length;
    var checkAll = document.getElementById('inquiryCheckAll');
    if (checkAll) checkAll.checked = false;

    if (!inquiryData.length) {
      body.innerHTML = '<tr><td colspan="7"><div class="empty-row">접수된 견적문의가 없습니다.</div></td></tr>';
      return;
    }

    body.innerHTML = inquiryData.map(function (row) {
      return '<tr>' +
        '<td style="text-align:center;"><input type="checkbox" class="inquiry-check" value="' + row.id + '" aria-label="선택"></td>' +
        '<td class="num-cell">' + row.date + '</td>' +
        '<td class="num-cell">' + row.time + '</td>' +
        '<td>' + row.brand + '</td>' +
        '<td>' + row.usageMethod + '</td>' +
        '<td class="title-cell">' + row.name + '</td>' +
        '<td class="num-cell">' + row.phone + '</td>' +
        '</tr>';
    }).join('');
  }

  async function refreshInquiryBadge() {
    try {
      inquiryTotal = await API.countTotalInquiries();
      await refreshUnifiedInquiryBadge();
      updateKpis();
    } catch (err) {
      console.warn('[Admin] inquiry badge:', err);
    }
  }

  async function markInquiryTabRead(tab) {
    if (tab === 'general') {
      await API.markAllInquiriesRead();
      inquiryUnread = 0;
    } else if (tab === 'newcar') {
      await API.markAllLeaseQuotesRead();
      leaseQuoteUnread = 0;
    } else if (tab === 'usedcar') {
      await API.markAllUsedCarInquiriesRead();
      usedCarInquiryUnread = 0;
    }
    updateInquiryTabBadges();
  }

  async function switchInquiryTab(tab) {
    activeInquiryTab = tab;
    setActiveInquiryTab(tab);
    try {
      await markInquiryTabRead(tab);
      if (tab === 'general') {
        inquiryData = await API.listInquiries();
        inquiryTotal = inquiryData.length;
        renderInquiriesTable();
        updateKpis();
      } else if (tab === 'newcar') {
        leaseQuoteData = await API.listLeaseQuotes();
        renderLeaseQuotesTable();
      } else if (tab === 'usedcar') {
        usedCarInquiryData = await API.listUsedCarInquiries();
        renderUsedCarInquiriesTable();
      }
    } catch (err) {
      showError(err);
    }
  }

  async function openInquiriesPanel() {
    try {
      inquiryData = await API.listInquiries();
      leaseQuoteData = await API.listLeaseQuotes();
      usedCarInquiryData = await API.listUsedCarInquiries();
      inquiryTotal = inquiryData.length;
      renderInquiriesTable();
      renderLeaseQuotesTable();
      renderUsedCarInquiriesTable();
      updateKpis();
      setActiveInquiryTab(activeInquiryTab || 'general');
    } catch (err) {
      showError(err);
    }
  }

  function updateLeaseQuoteBadge(count) {
    leaseQuoteUnread = Math.max(0, parseInt(count, 10) || 0);
    updateInquiryTabBadges();
  }

  function fmtWon(n) {
    var v = parseInt(n, 10);
    if (isNaN(v)) return String(n || '');
    return v.toLocaleString('ko-KR') + '원';
  }

  function renderLeaseQuoteDetailHtml(row) {
    var q = row.quote || {};
    var opts = (q.options || []).map(function (o) {
      return '<li>' + (o.name || '') + (o.price ? ' (+' + fmtWon(o.price) + ')' : '') + '</li>';
    }).join('') || '<li>없음</li>';
    var cond = q.conditions || {};
    var labels = cond.labels || {};
    return '<div style="display:grid;gap:12px;">' +
      '<div><b>고객</b><br>' + row.name + ' · ' + row.phone + '</div>' +
      '<div><b>차량</b><br>' + (q.origin_label || row.originLabel) + ' · ' + (q.brand_name || row.brandName) + ' · ' + (q.model_name || row.modelName) + '</div>' +
      '<div><b>외장색상</b><br>' + (q.color_name || '-') + (q.color_surcharge ? ' (+' + fmtWon(q.color_surcharge) + ')' : '') + '</div>' +
      '<div><b>세부모델(트림)</b><br>' + (q.trim_group ? q.trim_group + ' — ' : '') + (q.trim_name || '-') + (q.trim_price ? ' · ' + fmtWon(q.trim_price) : '') + '</div>' +
      '<div><b>추가 옵션</b><ul style="margin:6px 0 0 18px;padding:0;">' + opts + '</ul></div>' +
      '<div><b>이용조건</b><ul style="margin:6px 0 0 18px;padding:0;">' +
      '<li>이용방법: ' + (labels.method || cond.method || '-') + '</li>' +
      '<li>이용기간: ' + (labels.period || (cond.period ? cond.period + '개월' : '-')) + '</li>' +
      '<li>보증금: ' + (labels.deposit || cond.deposit || '-') + (cond.deposit_amount ? ' (' + cond.deposit_amount + ')' : '') + '</li>' +
      '<li>선납금: ' + (labels.prepay || cond.prepay || '-') + (cond.prepay_amount ? ' (' + cond.prepay_amount + ')' : '') + '</li>' +
      '<li>보험연령: ' + (labels.insAge || cond.insAge || '-') + '</li>' +
      '<li>자동차세: ' + (labels.carTax || cond.carTax || '-') + '</li>' +
      '<li>연간 주행: ' + (labels.mileage || cond.mileage || '-') + '</li>' +
      '<li>신용도: ' + (labels.credit || cond.credit || '-') + '</li>' +
      '</ul></div>' +
      (q.pricing ? '<div><b>참고 금액</b><br>기본 ' + (q.pricing.base || '-') + ' · 색상 ' + (q.pricing.color || '-') + ' · 옵션 ' + (q.pricing.options || '-') + ' · 합계 ' + (q.pricing.total || '-') + '</div>' : '') +
      '</div>';
  }

  function openLeaseQuoteDetail(id) {
    var row = leaseQuoteData.find(function (r) { return r.id === id; });
    if (!row) return;
    document.getElementById('modalLeaseQuoteTitle').textContent = '신차문의 — ' + row.brandName + ' ' + row.modelName;
    document.getElementById('modalLeaseQuoteBody').innerHTML = renderLeaseQuoteDetailHtml(row);
    openModal('modalLeaseQuoteDetail');
  }

  function renderLeaseQuotesTable() {
    var body = document.getElementById('leaseQuoteTableBody');
    var countEl = document.getElementById('leaseQuoteCount');
    if (countEl) countEl.textContent = leaseQuoteData.length;
    var checkAll = document.getElementById('leaseQuoteCheckAll');
    if (checkAll) checkAll.checked = false;
    if (!body) return;

    if (!leaseQuoteData.length) {
      body.innerHTML = '<tr><td colspan="9"><div class="empty-row">접수된 신차리스 견적이 없습니다.</div></td></tr>';
      return;
    }

    body.innerHTML = leaseQuoteData.map(function (row) {
      return '<tr>' +
        '<td style="text-align:center;"><input type="checkbox" class="lease-quote-check" value="' + row.id + '" aria-label="선택"></td>' +
        '<td class="num-cell">' + row.date + '</td>' +
        '<td class="num-cell">' + row.time + '</td>' +
        '<td>' + row.originLabel + '</td>' +
        '<td>' + row.brandName + '</td>' +
        '<td class="title-cell">' + row.modelName + '</td>' +
        '<td class="title-cell">' + row.name + '</td>' +
        '<td class="num-cell">' + row.phone + '</td>' +
        '<td><button type="button" class="btn btn-outline btn-sm" data-view-lq="' + row.id + '">상세</button></td>' +
        '</tr>';
    }).join('');

    body.querySelectorAll('[data-view-lq]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openLeaseQuoteDetail(parseInt(btn.dataset.viewLq, 10));
      });
    });
  }

  async function refreshLeaseQuoteBadge() {
    try {
      await refreshUnifiedInquiryBadge();
    } catch (err) {
      console.warn('[Admin] lease quote badge:', err);
    }
  }

  function fmtPriceMan(n) {
    var v = parseInt(n, 10);
    if (isNaN(v) || v <= 0) return '-';
    if (v >= 10000) return Math.round(v / 10000).toLocaleString('ko-KR') + '만원';
    return v.toLocaleString('ko-KR') + '원';
  }

  function renderUsedCarInquiryDetailHtml(row) {
    var img = row.thumbUrl
      ? '<img class="uc-inquiry-thumb" src="' + row.thumbUrl + '" alt="" data-uc-link="' + (row.detailUrl || '') + '">'
      : '<div class="uc-inquiry-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--ink-400);font-size:12px;">이미지 없음</div>';
    return '<div class="uc-inquiry-detail-grid">' +
      '<div>' + img + '</div>' +
      '<div><div class="row-label">브랜드</div><div>' + (row.brand || '-') + '</div></div>' +
      '<div><div class="row-label">차량명</div><div>' + (row.vehicleName || '-') + '</div></div>' +
      '<div><div class="row-label">상품제목</div><div>' + (row.productTitle || '-') + '</div></div>' +
      '<div><div class="row-label">차량가격</div><div>' + fmtPriceMan(row.price) + '</div></div>' +
      '<div><div class="row-label">성함</div><div>' + row.name + '</div></div>' +
      '<div><div class="row-label">연락처</div><div>' + row.phone + '</div></div>' +
      '</div>';
  }

  function openUsedCarInquiryDetail(id) {
    var row = usedCarInquiryData.find(function (r) { return r.id === id; });
    if (!row) return;
    document.getElementById('modalUsedCarInquiryTitle').textContent = '중고차문의 — ' + (row.productTitle || row.vehicleName || '상세');
    document.getElementById('modalUsedCarInquiryBody').innerHTML = renderUsedCarInquiryDetailHtml(row);
    var img = document.querySelector('#modalUsedCarInquiryBody .uc-inquiry-thumb[data-uc-link]');
    if (img && img.dataset.ucLink) {
      img.addEventListener('click', function () {
        window.open(img.dataset.ucLink, '_blank');
      });
    }
    openModal('modalUsedCarInquiryDetail');
  }

  function renderUsedCarInquiriesTable() {
    var body = document.getElementById('usedCarInquiryTableBody');
    var countEl = document.getElementById('usedCarInquiryCount');
    if (countEl) countEl.textContent = usedCarInquiryData.length;
    var checkAll = document.getElementById('usedCarInquiryCheckAll');
    if (checkAll) checkAll.checked = false;
    if (!body) return;

    if (!usedCarInquiryData.length) {
      body.innerHTML = '<tr><td colspan="9"><div class="empty-row">접수된 중고차문의가 없습니다.</div></td></tr>';
      return;
    }

    body.innerHTML = usedCarInquiryData.map(function (row) {
      return '<tr>' +
        '<td style="text-align:center;"><input type="checkbox" class="used-car-inquiry-check" value="' + row.id + '" aria-label="선택"></td>' +
        '<td class="num-cell">' + row.date + '</td>' +
        '<td class="num-cell">' + row.time + '</td>' +
        '<td>' + (row.brand || '-') + '</td>' +
        '<td class="title-cell">' + (row.vehicleName || '-') + '</td>' +
        '<td class="title-cell">' + (row.productTitle || '-') + '</td>' +
        '<td class="title-cell">' + row.name + '</td>' +
        '<td class="num-cell">' + row.phone + '</td>' +
        '<td><button type="button" class="btn btn-outline btn-sm" data-view-uci="' + row.id + '">상세</button></td>' +
        '</tr>';
    }).join('');

    body.querySelectorAll('[data-view-uci]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openUsedCarInquiryDetail(parseInt(btn.dataset.viewUci, 10));
      });
    });
  }

  async function openLeaseQuotesPanel() {
    activeInquiryTab = 'newcar';
    await openInquiriesPanel();
  }

  function renderYoutubeTable() {
    var body = document.getElementById('ytTableBody');
    document.getElementById('ytCount').textContent = youtubeData.length;
    if (!youtubeData.length) {
      body.innerHTML = '<tr><td colspan="8"><div class="empty-row">등록된 영상이 없습니다. 「채널 동기화」로 @purplelease 영상을 가져오세요.</div></td></tr>';
      updateKpis();
      return;
    }
    body.innerHTML = youtubeData.map(function (v) {
      return '<tr>' +
        '<td style="text-align:center;"><input type="radio" name="ytHomeMain" value="' + v.id + '"' + (v.isHomeMain ? ' checked' : '') + ' aria-label="메인영상"></td>' +
        '<td style="text-align:center;"><input type="checkbox" data-feat-yt="' + v.id + '"' + (v.isHomeFeatured ? ' checked' : '') + ' aria-label="추천영상"></td>' +
        '<td class="thumb-cell"><img src="' + v.thumb + '" alt=""></td>' +
        '<td class="title-cell">' + v.title + '</td>' +
        '<td><a href="' + v.url + '" target="_blank" rel="noopener" style="color:var(--purple-600);text-decoration:underline;">바로가기</a></td>' +
        '<td class="num-cell">' + v.duration + '</td>' +
        '<td class="num-cell">' + v.date + '</td>' +
        '<td class="row-actions"><button class="btn btn-outline btn-sm" data-edit-yt="' + v.id + '">수정</button>' +
        '<button class="btn-danger-text" data-del-yt="' + v.id + '">삭제</button></td></tr>';
    }).join('');

    body.querySelectorAll('input[name="ytHomeMain"]').forEach(function (el) {
      el.addEventListener('change', async function () {
        if (!el.checked) return;
        try {
          await API.setYoutubeHomeMain(parseInt(el.value, 10));
          youtubeData = await API.listYoutube();
          renderYoutubeTable();
        } catch (err) { showError(err); }
      });
    });
    body.querySelectorAll('[data-feat-yt]').forEach(function (el) {
      el.addEventListener('change', async function () {
        try {
          await API.setYoutubeHomeFeatured(parseInt(el.dataset.featYt, 10), el.checked);
          var item = youtubeData.find(function (x) { return x.id === parseInt(el.dataset.featYt, 10); });
          if (item) item.isHomeFeatured = el.checked;
        } catch (err) { showError(err); el.checked = !el.checked; }
      });
    });
    body.querySelectorAll('[data-edit-yt]').forEach(function (b) {
      b.addEventListener('click', function () { editYoutube(parseInt(b.dataset.editYt, 10)); });
    });
    body.querySelectorAll('[data-del-yt]').forEach(function (b) {
      b.addEventListener('click', function () { deleteYoutube(parseInt(b.dataset.delYt, 10)); });
    });
    updateKpis();
  }

  function editYoutube(id) {
    var v = youtubeData.find(function (x) { return x.id === id; });
    editingId = id;
    document.getElementById('modalYoutubeTitle').textContent = '영상 수정';
    document.getElementById('ytTitle').value = v.title;
    document.getElementById('ytUrl').value = v.url;
    document.getElementById('ytThumb').value = v.thumb;
    document.getElementById('ytDuration').value = v.duration;
    document.getElementById('ytDate').value = v.date;
    openModal('modalYoutube');
  }

  async function deleteYoutube(id) {
    if (!confirm('이 영상을 삭제하시겠습니까?')) return;
    try {
      await API.deleteYoutube(id);
      youtubeData = await API.listYoutube();
      renderYoutubeTable();
    } catch (err) { showError(err); }
  }

  function escapeAttr(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function renderBlogTable() {
    var body = document.getElementById('blogTableBody');
    document.getElementById('blogCount').textContent = blogData.length;
    if (!blogData.length) {
      body.innerHTML = '<tr><td colspan="6"><div class="empty-row">등록된 블로그 글이 없습니다.</div></td></tr>';
      return;
    }
    body.innerHTML = blogData.map(function (b) {
      return '<tr data-blog-row="' + b.id + '">' +
        '<td class="thumb-cell"><img src="' + escapeAttr(b.thumb) + '" onerror="this.style.opacity=0.15"></td>' +
        '<td class="title-cell">' + b.title + '</td>' +
        '<td><a href="' + b.url + '" target="_blank" rel="noopener" style="color:var(--purple-600);text-decoration:underline;">바로가기</a></td>' +
        '<td><input type="text" class="inline-edit-input" data-blog-date="' + b.id + '" value="' + escapeAttr(b.date) + '" placeholder="2026.06.25" aria-label="등록일"></td>' +
        '<td><input type="number" class="inline-edit-input" data-blog-views="' + b.id + '" value="' + (b.viewCount || 0) + '" min="0" step="1" aria-label="조회수"></td>' +
        '<td class="row-actions">' +
        '<button type="button" class="btn btn-primary btn-sm" data-save-blog-meta="' + b.id + '">저장</button> ' +
        '<button type="button" class="btn btn-outline btn-sm" data-edit-blog="' + b.id + '">수정</button> ' +
        '<button type="button" class="btn-danger-text" data-del-blog="' + b.id + '">삭제</button></td></tr>';
    }).join('');
    body.querySelectorAll('[data-save-blog-meta]').forEach(function (btn) {
      btn.addEventListener('click', function () { saveBlogMetaInline(parseInt(btn.dataset.saveBlogMeta, 10), btn); });
    });
    body.querySelectorAll('[data-edit-blog]').forEach(function (b) {
      b.addEventListener('click', function () { editBlog(parseInt(b.dataset.editBlog, 10)); });
    });
    body.querySelectorAll('[data-del-blog]').forEach(function (b) {
      b.addEventListener('click', function () { deleteBlog(parseInt(b.dataset.delBlog, 10)); });
    });
    updateKpis();
  }

  async function saveBlogMetaInline(id, btn) {
    var dateEl = document.querySelector('[data-blog-date="' + id + '"]');
    var viewsEl = document.querySelector('[data-blog-views="' + id + '"]');
    if (!dateEl || !viewsEl) return;
    var prevText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '저장 중…';
    try {
      await API.patchBlogMeta(id, {
        date: dateEl.value.trim(),
        viewCount: viewsEl.value.trim()
      });
      var item = blogData.find(function (x) { return x.id === id; });
      if (item) {
        item.date = dateEl.value.trim();
        item.viewCount = parseInt(viewsEl.value, 10) || 0;
      }
      btn.textContent = '저장됨';
      setTimeout(function () {
        btn.textContent = prevText;
        btn.disabled = false;
      }, 1200);
    } catch (err) {
      btn.textContent = prevText;
      btn.disabled = false;
      showError(err);
    }
  }

  function editBlog(id) {
    var b = blogData.find(function (x) { return x.id === id; });
    var dateEl = document.querySelector('[data-blog-date="' + id + '"]');
    var viewsEl = document.querySelector('[data-blog-views="' + id + '"]');
    editingId = id;
    document.getElementById('modalBlogTitle').textContent = '블로그 글 수정';
    document.getElementById('blogTitle').value = b.title;
    document.getElementById('blogUrl').value = b.url;
    document.getElementById('blogThumb').value = b.thumb;
    document.getElementById('blogDate').value = dateEl ? dateEl.value.trim() : (b.date || '');
    document.getElementById('blogViewCount').value = viewsEl ? viewsEl.value : (b.viewCount || 0);
    openModal('modalBlog');
  }

  async function deleteBlog(id) {
    if (!confirm('이 글을 삭제하시겠습니까?')) return;
    try {
      await API.deleteBlog(id);
      blogData = await API.listBlog();
      renderBlogTable();
    } catch (err) { showError(err); }
  }

  function renderReviewTable() {
    var body = document.getElementById('reviewTableBody');
    document.getElementById('reviewCount').textContent = reviewData.length;
    if (!reviewData.length) {
      body.innerHTML = '<tr><td colspan="5"><div class="empty-row">등록된 후기가 없습니다.</div></td></tr>';
      return;
    }
    body.innerHTML = reviewData.map(function (r) {
      return '<tr>' +
        '<td class="num-cell">#' + r.id + '</td>' +
        '<td class="title-cell">' + r.title + '</td>' +
        '<td class="num-cell">' + r.date + '</td>' +
        '<td class="num-cell">' + (r.views || 0).toLocaleString('ko-KR') + '</td>' +
        '<td class="row-actions"><button class="btn btn-outline btn-sm" data-edit-rv="' + r.id + '">수정</button>' +
        '<button class="btn-danger-text" data-del-rv="' + r.id + '">삭제</button></td></tr>';
    }).join('');
    body.querySelectorAll('[data-edit-rv]').forEach(function (b) {
      b.addEventListener('click', function () { editReview(parseInt(b.dataset.editRv, 10)); });
    });
    body.querySelectorAll('[data-del-rv]').forEach(function (b) {
      b.addEventListener('click', function () { deleteReview(parseInt(b.dataset.delRv, 10)); });
    });
    updateKpis();
  }

  function editReview(id) {
    var r = reviewData.find(function (x) { return x.id === id; });
    editingId = id;
    document.getElementById('modalReviewTitle').textContent = '후기 수정';
    document.getElementById('reviewTitle').value = r.title;
    document.getElementById('reviewBody').value = r.body;
    document.getElementById('reviewDate').value = r.date;
    openModal('modalReview');
  }

  async function deleteReview(id) {
    if (!confirm('이 후기를 삭제하시겠습니까?')) return;
    try {
      await API.deleteReview(id);
      reviewData = await API.listReviews();
      renderReviewTable();
    } catch (err) { showError(err); }
  }

  function renderPartsTable() {
    var body = document.getElementById('partsTableBody');
    document.getElementById('partsCount').textContent = partsData.length;
    if (!partsData.length) {
      body.innerHTML = '<tr><td colspan="7"><div class="empty-row">등록된 부품이 없습니다.</div></td></tr>';
      return;
    }
    body.innerHTML = partsData.map(function (p) {
      return '<tr>' +
        '<td class="thumb-cell"><img src="' + p.thumb + '" onerror="this.style.opacity=0.15"></td>' +
        '<td class="title-cell">' + p.name + '</td>' +
        '<td>' + (partsBrandLabel[p.brand] || p.brand) + '</td>' +
        '<td>' + p.category + '</td>' +
        '<td class="num-cell">' + p.price.toLocaleString('ko-KR') + '원</td>' +
        '<td><span class="chip ' + (p.stock === '품절' ? 'out' : 'ok') + '">' + p.stock + '</span></td>' +
        '<td class="row-actions"><button class="btn btn-outline btn-sm" data-edit-part="' + p.id + '">수정</button>' +
        '<button class="btn-danger-text" data-del-part="' + p.id + '">삭제</button></td></tr>';
    }).join('');
    body.querySelectorAll('[data-edit-part]').forEach(function (b) {
      b.addEventListener('click', function () { editPart(parseInt(b.dataset.editPart, 10)); });
    });
    body.querySelectorAll('[data-del-part]').forEach(function (b) {
      b.addEventListener('click', function () { deletePart(parseInt(b.dataset.delPart, 10)); });
    });
    updateKpis();
  }

  function editPart(id) {
    var p = partsData.find(function (x) { return x.id === id; });
    editingId = id;
    document.getElementById('modalPartTitle').textContent = '부품 수정';
    document.getElementById('partName').value = p.name;
    document.getElementById('partBrand').value = p.brand;
    document.getElementById('partCategory').value = p.category;
    document.getElementById('partCompatible').value = p.compatible || '';
    document.getElementById('partMaker').value = p.maker || '';
    document.getElementById('partPrice').value = p.price;
    document.getElementById('partStock').value = p.stock;
    document.getElementById('partPhotos').value = (p.photos && p.photos.length) ? p.photos.join('\n') : (p.thumb || '');
    document.getElementById('partTags').value = (p.tags || []).join(', ');
    document.getElementById('partDesc').value = p.description || '';
    document.getElementById('partPhotosFiles').value = '';
    pendingPartListingId = id;
    openModal('modalPart');
  }

  async function deletePart(id) {
    if (!confirm('이 부품을 삭제하시겠습니까?')) return;
    try {
      await API.deletePart(id);
      partsData = await API.listParts();
      renderPartsTable();
    } catch (err) { showError(err); }
  }

  function renderUsedcarsTable() {
    var body = document.getElementById('usedcarsTableBody');
    document.getElementById('usedcarsCount').textContent = usedcarsData.length;
    if (!usedcarsData.length) {
      body.innerHTML = '<tr><td colspan="7"><div class="empty-row">등록된 매물이 없습니다.</div></td></tr>';
      return;
    }
    body.innerHTML = usedcarsData.map(function (c) {
      return '<tr>' +
        '<td class="thumb-cell"><img src="' + c.thumb + '" onerror="this.style.opacity=0.15"></td>' +
        '<td class="title-cell">' + c.name + '</td>' +
        '<td class="num-cell">' + (c.year != null ? c.year + '년식' : '-') + '</td>' +
        '<td class="num-cell">' + c.mileage.toLocaleString('ko-KR') + 'km</td>' +
        '<td class="num-cell">' + c.price.toLocaleString('ko-KR') + '만원</td>' +
        '<td><span class="chip ' + (c.status === '판매완료' ? 'muted' : 'ok') + '">' + c.status + '</span></td>' +
        '<td class="row-actions"><button class="btn btn-outline btn-sm" data-edit-uc="' + c.id + '">수정</button>' +
        '<button class="btn-danger-text" data-del-uc="' + c.id + '">삭제</button></td></tr>';
    }).join('');
    body.querySelectorAll('[data-edit-uc]').forEach(function (b) {
      b.addEventListener('click', function () { editUsedcar(parseInt(b.dataset.editUc, 10)); });
    });
    body.querySelectorAll('[data-del-uc]').forEach(function (b) {
      b.addEventListener('click', function () { deleteUsedcar(parseInt(b.dataset.delUc, 10)); });
    });
    updateKpis();
  }

  function editUsedcar(id) {
    var c = usedcarsData.find(function (x) { return x.id === id; });
    editingId = id;
    document.getElementById('modalUsedcarTitle').textContent = '매물 수정';
    document.getElementById('ucName').value = c.name;
    document.getElementById('ucYear').value = c.year || '';
    document.getElementById('ucMileage').value = c.mileage;
    document.getElementById('ucPrice').value = c.price;
    document.getElementById('ucStatus').value = c.status;
    document.getElementById('ucThumb').value = c.thumb;
    document.getElementById('ucOrigin').value = c.origin || 'domestic';
    document.getElementById('ucBrand').value = c.brand || '';
    document.getElementById('ucSegment').value = c.segment || '';
    document.getElementById('ucFuel').value = c.fuel || '';
    openModal('modalUsedcar');
  }

  async function deleteUsedcar(id) {
    var item = usedcarsData.find(function (x) { return x.id === id; });
    var msg = (item && item.syncSource === 'swautopia')
      ? 'swautopia 동기화 매물입니다.\n사이트에서 숨기며, 이후 동기화에도 다시 등록되지 않습니다.\n계속하시겠습니까?'
      : '이 매물을 삭제하시겠습니까?';
    if (!confirm(msg)) return;
    try {
      await API.deleteUsedcar(id);
      usedcarsData = await API.listUsedcars();
      renderUsedcarsTable();
    } catch (err) { showError(err); }
  }

  function leaseBrandTreeHtml(brands) {
    return brands.map(function (b) {
      return '<div class="tree-item' + (b.id === selectedLeaseBrand ? ' active' : '') + '" data-brand="' + b.id + '">' + b.name + '</div>';
    }).join('');
  }

  async function renderLeaseBrandList() {
    var list = document.getElementById('leaseBrandList');
    var domestic = leaseBrands.filter(function (b) { return b.origin !== 'import'; });
    var imported = leaseBrands.filter(function (b) { return b.origin === 'import'; });
    var html = '';
    if (domestic.length) {
      html += '<div class="tree-section-label">국산차</div>' + leaseBrandTreeHtml(domestic);
    }
    if (imported.length) {
      html += '<div class="tree-section-label">수입차</div>' + leaseBrandTreeHtml(imported);
    }
    if (!html) html = '<div class="empty-row" style="padding:14px;">등록된 브랜드가 없습니다.</div>';
    list.innerHTML = html;
    list.querySelectorAll('.tree-item').forEach(function (el) {
      el.addEventListener('click', function () {
        selectedLeaseBrand = el.dataset.brand;
        renderLeaseBrandList();
        renderLeaseModelArea();
      });
    });
  }

  async function renderLeaseModelArea() {
    var area = document.getElementById('leaseModelArea');
    var brand = leaseBrands.find(function (b) { return b.id === selectedLeaseBrand; });
    if (!brand) {
      area.innerHTML = '<div class="empty-row">왼쪽에서 브랜드를 선택하세요.</div>';
      return;
    }
    var models = await API.listLeaseModels(brand.dbId);
    brand.models = models;
    area.innerHTML =
      '<div class="toolbar" style="margin-bottom:12px;"><div class="toolbar-left"><b>' + brand.name + '</b> 모델</div>' +
      '<button class="btn btn-primary btn-sm" id="btnAddLeaseModel">+ 모델 추가</button></div>' +
      '<table class="data-table"><thead><tr><th>모델명</th><th>가격대(만원)</th><th></th></tr></thead><tbody>' +
      models.map(function (m) {
        var sum = (window.PurpleLeaseCatalog && PurpleLeaseCatalog.trimConfigSummary)
          ? PurpleLeaseCatalog.trimConfigSummary(m.config)
          : { label: '트림/옵션(준비중)', trims: 0 };
        var trimBtn = sum.trims > 0
          ? '<span class="btn btn-outline btn-sm" style="pointer-events:none;">' + sum.label + '</span>'
          : '<button class="btn btn-outline btn-sm" type="button" disabled>트림/옵션(준비중)</button>';
        return '<tr><td class="title-cell">' + m.name + '</td><td class="num-cell">' + m.priceFrom + '~' + m.priceTo + '</td>' +
          '<td class="row-actions">' + trimBtn +
          '<button class="btn-danger-text" data-del-model="' + m.dbId + '">삭제</button></td></tr>';
      }).join('') +
      '</tbody></table>' +
      '<p style="font-size:11.5px;color:var(--ink-400);margin-top:10px;">트림·옵션·색상은 KS 동기화 시 config_json에 저장됩니다. 수동 추가 항목(source=manual)은 동기화로 삭제되지 않습니다.</p>';

    var addBtn = document.getElementById('btnAddLeaseModel');
    if (addBtn) {
      addBtn.addEventListener('click', async function () {
        var name = prompt('모델명을 입력하세요');
        if (!name) return;
        var slug = prompt('slug (영문, 예: g80)', name.toLowerCase().replace(/\s+/g, '-'));
        if (!slug) return;
        var priceFrom = prompt('가격 시작(만원, 예: 5,899)', '');
        var priceTo = prompt('가격 끝(만원, 예: 8,666)', priceFrom || '');
        try {
          await API.saveLeaseModel(brand.dbId, { slug: slug, name: name, priceFrom: priceFrom || '', priceTo: priceTo || '', img: '' }, null);
          await renderLeaseModelArea();
        } catch (err) { showError(err); }
      });
    }
    area.querySelectorAll('[data-del-model]').forEach(function (b) {
      b.addEventListener('click', async function () {
        if (!confirm('이 모델을 삭제하시겠습니까?')) return;
        try {
          await API.deleteLeaseModel(parseInt(b.dataset.delModel, 10));
          await renderLeaseModelArea();
        } catch (err) { showError(err); }
      });
    });
  }

  function ksSyncErrorText(result) {
    var parts = [result && result.msg || ''];
    var pending = (result && result.resumeState && result.resumeState.pending_brands || [])
      .concat(result && result.resumeState && result.resumeState.pending_models || []);
    pending.forEach(function (e) { parts.push(e.error || ''); });
    return parts.join(' ');
  }

  function isKsIpBlockedError(result) {
    var errText = ksSyncErrorText(result).toLowerCase();
    return /447|403|upstream/.test(errText);
  }

  function renderKsSyncModal(result) {
    var title = document.getElementById('modalKsSyncTitle');
    var body = document.getElementById('modalKsSyncBody');
    var resumeBtn = document.getElementById('btnKsSyncResume');
    var countryLabel = result.country === 'import' ? '수입차' : '국산차';
    title.textContent = countryLabel + ' KS 동기화 ' + (result.ok ? '완료' : (result.complete ? '부분 완료' : '진행 중단'));
    var s = result.stats || {};
    var html = '<p><b>' + (result.msg || '') + '</b></p>' +
      '<ul style="margin:8px 0 12px 18px;padding:0;">' +
      '<li>브랜드 성공 ' + (s.brandsOk || 0) + ' / 실패 ' + (s.brandsFail || 0) + '</li>' +
      '<li>모델 성공 ' + (s.modelsOk || 0) + ' / 실패 ' + (s.modelsFail || 0) + '</li>' +
      '<li>신규 ' + (s.inserted || 0) + ' · 갱신 ' + (s.updated || 0) + ' · 비활성 ' + (s.deactivated || 0) +
      (s.trimsFiltered ? ' · 공란트림 제외 ' + s.trimsFiltered : '') + '</li>' +
      '<li>소요 ' + Math.round((result.durationMs || 0) / 1000) + '초</li>' +
      '</ul>';
    var errors = (result.resumeState && result.resumeState.pending_brands || []).concat(result.resumeState && result.resumeState.pending_models || []);
    if (errors.length) {
      html += '<p style="color:#b45309;margin-bottom:6px;">실패 ' + errors.length + '건 — 다음 동기화에서 이어서 처리됩니다.</p>' +
        '<ul style="margin:0 0 8px 18px;padding:0;max-height:180px;overflow:auto;font-size:12px;">' +
        errors.slice(0, 30).map(function (e) {
          return '<li>' + (e.name || e.ks_model_id || e.ks_brand_id) + ': ' + (e.error || '') + '</li>';
        }).join('') +
        (errors.length > 30 ? '<li>… 외 ' + (errors.length - 30) + '건</li>' : '') +
        '</ul>';
    }
    if (!result.ok && isKsIpBlockedError(result)) {
      html += '<p style="color:#b45309;margin-top:8px;">서버 IP가 KS에서 차단됨. Edge Function 배포 후 재시도 또는 GitHub Actions sync-ks-lease 실행</p>';
    }
    if (!result.ok && result.complete) {
      html += '<p class="hint">브라우저 CORS 오류 시 서버에서 <code>node scripts/sync-ks-lease.js ' + result.country + '</code> 를 실행하세요.</p>';
    }
    body.innerHTML = html;
    lastKsSyncCountry = result.country;
    lastKsSyncCanResume = !!result.canResume;
    resumeBtn.style.display = result.canResume ? 'inline-flex' : 'none';
    openModal('modalKsSync');
  }

  function fmtKsSyncBrandScope(lg) {
    var diag = lg.diag || {};
    if (diag.brand_scope) return diag.brand_scope;
    if (diag.brand_names && diag.brand_names.length) {
      if (diag.brand_names.length === 1) return diag.brand_names[0];
      if (diag.mode === 'partial' || (diag.brand_ids && diag.brand_ids.length)) {
        return diag.brand_names.join(', ');
      }
    }
    if (diag.mode === 'partial') return '선택';
    if (diag.mode === 'resume') return '재시도';
    if (diag.mode === 'full') return '전체';
    var total = (lg.models_ok || 0) + (lg.models_fail || 0);
    if (lg.country === 'import' && total >= 80) return '전체';
    if (lg.country !== 'import' && total >= 40) return '전체';
    return '전체';
  }

  function fmtKsSyncLogLine(lg) {
    var d = new Date(lg.started_at);
    if (isNaN(d.getTime())) return '—';
    var md = (d.getMonth() + 1) + '/' + d.getDate();
    var tm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
    var total = (lg.models_ok || 0) + (lg.models_fail || 0);
    var country = lg.country === 'import' ? '수입' : '국산';
    var scope = fmtKsSyncBrandScope(lg);
    return country + ' / ' + scope + ' · ' + md + ' ' + tm + ' · ' + total + '건 · ' + (lg.models_ok || 0) + '성공 · ' + (lg.models_fail || 0) + '실패';
  }

  function ksSyncLogCanRetry(lg) {
    if (!lg) return false;
    var rs = lg.resume_state || {};
    var pending = ((rs.pending_brands) || []).length + ((rs.pending_models) || []).length;
    return pending > 0 && !lg.ok;
  }

  async function renderLeaseSyncLogArea() {
    var el = document.getElementById('leaseSyncLogArea');
    if (!el) return;
    try {
      var logs = await API.listLeaseSyncLogs(null, 3);
      if (!logs.length) {
        el.innerHTML = '최근 KS 동기화 이력이 없습니다.';
        return;
      }
      el.innerHTML = '<b>최근 동기화</b> — ' + logs.map(fmtKsSyncLogLine).join(' · ');
    } catch (err) {
      el.textContent = '';
    }
  }

  async function openKsSyncLogsModal() {
    var body = document.getElementById('modalKsSyncLogsBody');
    body.innerHTML = '<p style="color:var(--ink-400);">불러오는 중…</p>';
    openModal('modalKsSyncLogs');
    try {
      var logs = await API.listLeaseSyncLogs(null, 30);
      if (!logs.length) {
        body.innerHTML = '<p class="empty-row">동기화 로그가 없습니다.</p>';
        return;
      }
      body.innerHTML = logs.map(function (lg) {
        var retryBtn = ksSyncLogCanRetry(lg)
          ? ' <button type="button" class="btn btn-outline btn-sm" data-retry-log="' + lg.id + '">나머지 재시도</button>'
          : '';
        var status = lg.ok ? '<span style="color:#059669;">완료</span>' : '<span style="color:#b45309;">부분실패</span>';
        return '<div style="padding:10px 0;border-bottom:1px solid var(--line-200);display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
          '<span style="flex:1;min-width:200px;">' + fmtKsSyncLogLine(lg) + ' · ' + status + retryBtn + '</span>' +
          '</div>';
      }).join('');
      body.querySelectorAll('[data-retry-log]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          retryKsSyncFromLog(parseInt(btn.dataset.retryLog, 10));
        });
      });
    } catch (err) {
      body.innerHTML = '<p style="color:#b91c1c;">' + (err.message || err) + '</p>';
    }
  }

  async function retryKsSyncFromLog(logId) {
    try {
      var log = await API.getLeaseSyncLog(logId);
      if (!log) { alert('로그를 찾을 수 없습니다.'); return; }
      if (!ksSyncLogCanRetry(log)) { alert('재시도할 실패 항목이 없습니다.'); return; }
      closeModal('modalKsSyncLogs');
      await runKsLeaseSync(log.country, { resumeLogId: logId, resume: true });
    } catch (err) { showError(err); }
  }

  async function loadKsSyncBrandOptions(country) {
    var Sync = window.KsLeaseSync;
    var origin = country === 'import' ? 'import' : 'domestic';
    var fromKs = [];
    var ksError = '';
    if (Sync && Sync.createHttp && Sync.fetchBrands) {
      try {
        var http = Sync.createHttp();
        var ksList = await Sync.fetchBrands(http, country);
        fromKs = (ksList || []).map(function (b) {
          return { ksBrandId: parseInt(b.idx, 10), name: b.name || ('브랜드 ' + b.idx) };
        });
      } catch (err) {
        ksError = err.message || String(err);
      }
    }
    if (fromKs.length) return { brands: fromKs, ksError: '' };
    var fromDb = leaseBrands.filter(function (b) {
      return b.origin === origin && b.ksBrandId;
    }).map(function (b) {
      return { ksBrandId: b.ksBrandId, name: b.name };
    });
    return { brands: fromDb, ksError: ksError };
  }

  async function openKsSyncBrandModal(country) {
    pendingKsSyncCountry = country;
    var countryLabel = country === 'import' ? '수입차' : '국산차';
    document.getElementById('modalKsSyncBrandPickTitle').textContent = countryLabel + ' — 동기화할 브랜드 선택';
    var body = document.getElementById('modalKsSyncBrandPickBody');
    body.innerHTML = '<p style="color:var(--ink-400);">브랜드 목록 불러오는 중…</p>';
    openModal('modalKsSyncBrandPick');
    var loaded = await loadKsSyncBrandOptions(country);
    if (!loaded.brands.length) {
      body.innerHTML = '<p class="empty-row">동기화 가능한 브랜드가 없습니다.<br>GitHub Actions 「Sync KS Lease」로 전체 동기화 후 다시 시도하세요.</p>' +
        (loaded.ksError ? '<p style="color:#b45309;margin-top:8px;font-size:12px;">KS 조회 실패: ' + loaded.ksError + '</p>' : '');
      return;
    }
    var hint = loaded.ksError
      ? '<p style="color:#b45309;font-size:12px;margin:0 0 10px;">KS 직접 조회 실패 — DB에 저장된 브랜드 목록을 표시합니다.</p>'
      : '<p style="font-size:12px;color:var(--ink-400);margin:0 0 10px;">동기화할 브랜드를 선택하세요. (선택한 브랜드만 upsert, 비활성 처리는 생략)</p>';
    body.innerHTML = hint +
      '<label style="display:block;margin-bottom:8px;font-size:12px;"><input type="checkbox" id="ksSyncBrandCheckAll" checked> 전체 선택</label>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px;">' +
      loaded.brands.map(function (b) {
        return '<label style="font-size:12.5px;display:flex;gap:6px;align-items:center;">' +
          '<input type="checkbox" class="ks-sync-brand-cb" value="' + b.ksBrandId + '" checked> ' +
          b.name + '</label>';
      }).join('') +
      '</div>';
    var checkAll = document.getElementById('ksSyncBrandCheckAll');
    checkAll.addEventListener('change', function () {
      body.querySelectorAll('.ks-sync-brand-cb').forEach(function (cb) { cb.checked = checkAll.checked; });
    });
  }

  async function runKsLeaseSync(country, opts) {
    opts = opts || {};
    if (typeof opts === 'boolean') opts = { resume: opts };
    var resume = !!opts.resume;
    var brandIds = opts.brandIds || [];
    var resumeLogId = opts.resumeLogId || null;
    var partialBrands = brandIds.length > 0;
    var btnDom = document.getElementById('btnSyncKsDomestic');
    var btnImp = document.getElementById('btnSyncKsImport');
    var btn = country === 'import' ? btnImp : btnDom;
    var other = country === 'import' ? btnDom : btnImp;
    var countryLabel = country === 'import' ? '수입차' : '국산차';
    var willResume = resume || !!resumeLogId;
    if (!willResume && !partialBrands) {
      try {
        var lastLog = await API.getLatestLeaseSyncLog(country);
        var rs = lastLog && lastLog.resume_state;
        var pendingN = ((rs && rs.pending_brands) || []).length + ((rs && rs.pending_models) || []).length;
        if (pendingN > 0 && !lastLog.ok) {
          willResume = confirm('이전 ' + countryLabel + ' 동기화에서 실패한 항목 ' + pendingN + '건이 있습니다.\n\n확인 = 실패 항목만 이어서 동기화\n취소 = 전체 새로 동기화');
        }
      } catch (_) { /* ignore */ }
    }
    var scopeNote = partialBrands
      ? '\n\n선택 브랜드 ' + brandIds.length + '개만 동기화합니다.'
      : (willResume ? '\n\n실패한 브랜드·모델만 이어서 upsert 합니다.' : '\n\nKS 소스 전체를 새로 조회합니다.');
    if (!confirm('KS오토플랜 ' + countryLabel + ' 견적 데이터를 동기화하시겠습니까?' + scopeNote + '\n\n모델 수에 따라 수 분 이상 걸릴 수 있습니다.')) return;
    btn.disabled = true;
    other.disabled = true;
    var prev = btn.textContent;
    btn.textContent = '동기화 중…';
    try {
      var result = await API.syncKsLease(country, function (p) {
        if (p.phase === 'brand') btn.textContent = '브랜드 ' + p.index + '/' + p.total;
        else if (p.phase === 'model') btn.textContent = p.name + ' (' + p.index + '/' + p.total + ')';
        else if (p.phase === 'resume') btn.textContent = '재개 (B' + p.brands + '/M' + p.models + ')';
        else if (p.phase === 'deactivate') btn.textContent = '비활성 처리…';
      }, { resume: willResume, brandIds: brandIds, resumeLogId: resumeLogId });
      leaseBrands = await API.listLeaseBrands();
      await renderLeaseBrandList();
      if (selectedLeaseBrand) await renderLeaseModelArea();
      await renderLeaseSyncLogArea();
      renderKsSyncModal(result);
    } catch (err) {
      showError(err);
    } finally {
      btn.disabled = false;
      other.disabled = false;
      btn.textContent = prev;
    }
  }

  async function loadTodayVisitors() {
    try {
      var today = kstTodayStr();
      var data = await API.fetchAnalytics({ from: today, to: today });
      var row = data.today;
      if (!row) {
        todayVisitorCount = 0;
        return;
      }
      todayVisitorCount = parseInt(row.uv_human, 10);
      if (isNaN(todayVisitorCount)) todayVisitorCount = parseInt(row.uv, 10) || 0;
    } catch (err) {
      console.warn('[Admin] today visitors:', err);
      todayVisitorCount = null;
    }
  }

  async function loadAll() {
    var todayVisitorsPromise = loadTodayVisitors();
    youtubeData = await API.listYoutube();
    blogData = await API.listBlog();
    reviewData = await API.listReviews();
    partsData = await API.listParts();
    usedcarsData = await API.listUsedcars();
    leaseBrands = await API.listLeaseBrands();
    renderYoutubeTable();
    renderBlogTable();
    renderReviewTable();
    renderPartsTable();
    renderUsedcarsTable();
    await renderLeaseBrandList();
    await renderLeaseSyncLogArea();
    await todayVisitorsPromise;
    await refreshUnifiedInquiryBadge();
    updateKpis();
  }

  var seoPageData = [];
  var seoSettingsCache = null;

  function escInputVal(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function htmlFileForPath(pagePath) {
    var map = (window.PurpleSeoStaticMeta && window.PurpleSeoStaticMeta.PAGE_TO_HTML) || {};
    return map[pagePath] || '';
  }

  function updateSeoOgPreview() {
    var el = document.getElementById('seoOgPreview');
    var url = (document.getElementById('seoOgImage') || {}).value.trim();
    if (!el) return;
    if (url) {
      el.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
      el.hidden = false;
    } else {
      el.hidden = true;
      el.removeAttribute('src');
    }
  }

  function setActiveSeoTab(tab) {
    document.querySelectorAll('#panel-seo .inquiry-tab[data-seo-tab]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.seoTab === tab);
    });
    document.querySelectorAll('#panel-seo .inquiry-tab-panel').forEach(function (p) { p.classList.remove('active'); });
    var map = { basic: 'seoTabBasic', pages: 'seoTabPages', sitemap: 'seoTabSitemap' };
    var el = document.getElementById(map[tab] || 'seoTabBasic');
    if (el) el.classList.add('active');
  }

  function renderSeoPageCards() {
    var wrap = document.getElementById('seoPageCards');
    if (!wrap) return;
    if (!seoPageData.length) {
      wrap.innerHTML = '<div class="empty-row">seo_page_meta 데이터가 없습니다. migration-seo.sql을 실행하세요.</div>';
      return;
    }
    wrap.innerHTML = seoPageData.map(function (row, idx) {
      var htmlFile = htmlFileForPath(row.page_path);
      return '<div class="seo-page-card" data-seo-idx="' + idx + '">' +
        '<div class="seo-page-card-head"><b>' + escInputVal(row.page_path) + '</b>' +
        (htmlFile ? '<span class="hint">' + htmlFile + '</span>' : '') +
        '<span class="hint" style="margin-left:auto;">priority <input type="number" class="seo-in-priority" value="' + row.sitemap_priority + '" step="0.05" min="0" max="1" style="width:64px;margin-left:4px;"> noindex <input type="checkbox" class="seo-in-noindex"' + (row.noindex ? ' checked' : '') + '></span></div>' +
        '<div class="form-row"><label>&lt;title&gt;</label><input type="text" class="seo-in-title" value="' + escInputVal(row.title) + '"></div>' +
        '<div class="form-row"><label>meta description</label><textarea class="seo-in-desc" rows="2">' + escInputVal(row.description) + '</textarea></div>' +
        '<div class="form-row"><label>meta keywords (쉼표 구분)</label><textarea class="seo-in-keywords" rows="2">' + escInputVal(row.meta_keywords) + '</textarea></div>' +
        '<div class="form-grid-2">' +
          '<div class="form-row"><label>og:title</label><input type="text" class="seo-in-og-title" value="' + escInputVal(row.og_title || row.title) + '"></div>' +
          '<div class="form-row"><label>og:description</label><textarea class="seo-in-og-desc" rows="2">' + escInputVal(row.og_description) + '</textarea></div>' +
        '</div>' +
        '<div class="form-row"><label>twitter:description</label><textarea class="seo-in-twitter-desc" rows="2">' + escInputVal(row.twitter_description) + '</textarea><span class="hint">비우면 og:description 사용</span></div>' +
        '</div>';
    }).join('');
  }

  function collectSeoPageRows() {
    var rows = [];
    document.querySelectorAll('.seo-page-card[data-seo-idx]').forEach(function (card) {
      var idx = parseInt(card.dataset.seoIdx, 10);
      var base = seoPageData[idx];
      if (!base) return;
      var title = card.querySelector('.seo-in-title').value.trim();
      var ogTitle = card.querySelector('.seo-in-og-title').value.trim() || title;
      var ogDesc = card.querySelector('.seo-in-og-desc').value.trim();
      var twitterDesc = card.querySelector('.seo-in-twitter-desc').value.trim();
      rows.push({
        page_path: base.page_path,
        title: title,
        description: card.querySelector('.seo-in-desc').value.trim(),
        meta_keywords: card.querySelector('.seo-in-keywords').value.trim(),
        og_title: ogTitle,
        og_description: ogDesc || card.querySelector('.seo-in-desc').value.trim(),
        twitter_description: twitterDesc || ogDesc || card.querySelector('.seo-in-desc').value.trim(),
        noindex: card.querySelector('.seo-in-noindex').checked,
        sitemap_priority: parseFloat(card.querySelector('.seo-in-priority').value) || 0.5,
        sitemap_changefreq: base.sitemap_changefreq || 'weekly',
        updated_at: new Date().toISOString()
      });
    });
    return rows;
  }

  async function runPublishStaticSeo(statusEl) {
    if (statusEl) {
      statusEl.textContent = 'SNS·정적 HTML 반영 요청 중…';
      statusEl.style.color = 'var(--ink-600)';
    }
    var result = await API.queueStaticSeoPatch();
    if (statusEl) {
      if (result.queued) {
        statusEl.textContent = '요청 완료 — 서버에서 3분 이내 HTML meta가 갱신됩니다. 카카오 디버거는 「캐시 초기화」 후 재스크랩하세요.';
      } else {
        statusEl.textContent = '반영 요청은 건너뛰었지만 DB 변경은 3분 이내 cron으로 HTML에 자동 반영됩니다.';
      }
      statusEl.style.color = 'var(--green-700, #15803d)';
    }
  }

  function seoPatchStatusSuffix(result) {
    if (result && result.queued) {
      return ' SNS·정적 HTML 3분 이내 반영됩니다.';
    }
    return ' DB 저장 완료 — HTML meta는 3분 이내 서버 cron으로 자동 반영됩니다.';
  }

  function renderSeoPageTable() {
    renderSeoPageCards();
  }

  async function loadSeoPanel() {
    try {
      var settings = await API.getSeoSettings();
      seoSettingsCache = settings;
      if (settings) {
        document.getElementById('seoSiteName').value = settings.site_name || '퍼플오토';
        document.getElementById('seoSiteUrl').value = settings.site_url || 'https://purpleauto.co.kr';
        document.getElementById('seoDefaultDesc').value = settings.default_description || '';
        document.getElementById('seoOgImage').value = settings.og_image_url || '';
        document.getElementById('seoGoogleVerify').value = settings.google_verification || '';
        document.getElementById('seoNaverVerify').value = settings.naver_verification || '';
        document.getElementById('seoRobotsExtra').value = settings.robots_extra || '';
        updateSeoOgPreview();
      }
      seoPageData = await API.listSeoPageMeta();
      renderSeoPageCards();
      setActiveSeoTab('basic');
    } catch (err) {
      showError(err);
    }
  }

  async function runGenerateSitemap() {
    var btn = document.getElementById('btnGenerateSitemap');
    var statusEl = document.getElementById('seoSitemapStatus');
    if (!btn || !statusEl) {
      alert('사이트맵 UI를 찾을 수 없습니다. 페이지를 새로고침(Ctrl+F5)해 주세요.');
      return;
    }
    if (btn.disabled) return;
    btn.disabled = true;
    statusEl.textContent = '사이트맵 생성 중…';
    statusEl.style.color = 'var(--ink-600)';
    try {
      var result = await API.generateSitemap();
      statusEl.innerHTML = '완료 — <b>' + result.count + '개</b> URL 생성 · Storage 업로드됨<br>' +
        '라이브 반영: <a href="' + result.liveUrl + '?t=' + Date.now() + '" target="_blank" rel="noopener">' + result.liveUrl + '</a> ' +
        '(서버 동기화는 최대 5분, 또는 GitHub Actions 「Sync Sitemap to Server」 실행)';
      statusEl.style.color = 'var(--green-700, #15803d)';
    } catch (err) {
      statusEl.textContent = err.message || String(err);
      statusEl.style.color = '#c0392b';
      showError(err);
    } finally {
      btn.disabled = false;
    }
  }

  function fmtAnalyticsNum(n) {
    return (parseInt(n, 10) || 0).toLocaleString('ko-KR');
  }

  function kstTodayStr() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  }

  function addDaysKst(dateStr, delta) {
    var parts = String(dateStr).split('-');
    var d = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
    d.setUTCDate(d.getUTCDate() + delta);
    return d.toISOString().slice(0, 10);
  }

  function monthOptionsKst(count) {
    var out = [];
    var today = kstTodayStr();
    var y = parseInt(today.slice(0, 4), 10);
    var m = parseInt(today.slice(5, 7), 10);
    for (var i = 0; i < count; i++) {
      var mm = String(m).padStart(2, '0');
      out.push(y + '-' + mm);
      m -= 1;
      if (m < 1) { m = 12; y -= 1; }
    }
    return out;
  }

  function buildAnalyticsRange() {
    if (analyticsMonth) {
      var p = analyticsMonth.split('-');
      var y = parseInt(p[0], 10);
      var m = parseInt(p[1], 10);
      var lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      return {
        from: analyticsMonth + '-01',
        to: analyticsMonth + '-' + String(lastDay).padStart(2, '0')
      };
    }
    var to = kstTodayStr();
    return { from: addDaysKst(to, -(analyticsDays - 1)), to: to };
  }

  function populateAnalyticsMonthSelect() {
    var sel = document.getElementById('analyticsMonthPick');
    if (!sel || sel.dataset.filled === '1') return;
    monthOptionsKst(14).forEach(function (mo) {
      var opt = document.createElement('option');
      opt.value = mo;
      opt.textContent = mo;
      sel.appendChild(opt);
    });
    sel.dataset.filled = '1';
  }

  function renderAnalyticsSummary(data) {
    var s = data.summary || {};
    document.getElementById('anPv').textContent = fmtAnalyticsNum(s.pv);
    document.getElementById('anUv').textContent = fmtAnalyticsNum(s.uv);
    document.getElementById('anPvHuman').textContent = fmtAnalyticsNum(s.pv_human);
    document.getElementById('anUvHuman').textContent = fmtAnalyticsNum(s.uv_human);
    document.getElementById('anPvBot').textContent = fmtAnalyticsNum(s.pv_bot);
    document.getElementById('anUvBot').textContent = fmtAnalyticsNum(s.uv_bot);
    document.getElementById('anDesktop').textContent = fmtAnalyticsNum(s.pv_desktop) + ' / ' + fmtAnalyticsNum(s.uv_desktop);
    document.getElementById('anMobile').textContent = fmtAnalyticsNum(s.pv_mobile) + ' / ' + fmtAnalyticsNum(s.uv_mobile);
    document.getElementById('anTablet').textContent = fmtAnalyticsNum(s.pv_tablet) + ' / ' + fmtAnalyticsNum(s.uv_tablet);
    var t = data.today;
    var todayEl = document.getElementById('anToday');
    if (todayEl) {
      if (t) {
        todayEl.textContent = '페이지뷰 ' + fmtAnalyticsNum(t.pv) + ' · 방문자수 ' + fmtAnalyticsNum(t.uv) + ' · 일반 페이지뷰 ' + fmtAnalyticsNum(t.pv_human);
      } else {
        todayEl.textContent = '페이지뷰 0 · 방문자수 0 · 일반 페이지뷰 0';
      }
    }
    var rangeEl = document.getElementById('analyticsRangeLabel');
    if (rangeEl && data.range) {
      rangeEl.textContent = data.range.from + ' ~ ' + data.range.to;
    }
  }

  function renderAnalyticsTable(data) {
    var tbody = document.getElementById('analyticsTableBody');
    var thead = document.getElementById('analyticsTableHead');
    if (!tbody || !thead) return;
    var rows = analyticsTab === 'monthly' ? (data.monthly || []) : (data.daily || []);
    var maxPv = 1;
    rows.forEach(function (r) { if ((r.pv || 0) > maxPv) maxPv = r.pv; });

    if (analyticsTab === 'monthly') {
      thead.innerHTML = '<tr><th>월</th><th>페이지뷰</th><th>방문자수</th><th>일반 페이지뷰</th><th>봇 페이지뷰</th><th>PC</th><th>모바일</th><th>태블릿</th></tr>';
    } else {
      thead.innerHTML = '<tr><th>날짜</th><th>페이지뷰</th><th>방문자수</th><th>일반 페이지뷰</th><th>봇 페이지뷰</th><th>PC</th><th>모바일</th><th>태블릿</th></tr>';
    }

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--ink-400);padding:24px;">표시할 데이터가 없습니다.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (r) {
      var label = analyticsTab === 'monthly'
        ? String(r.stat_month || '').slice(0, 7)
        : String(r.stat_date || '').slice(0, 10);
      var barPct = Math.min(100, Math.round(((r.pv || 0) / maxPv) * 100));
      return '<tr>' +
        '<td><div>' + label + '</div><div class="analytics-bar"><span style="width:' + barPct + '%"></span></div></td>' +
        '<td class="num-cell">' + fmtAnalyticsNum(r.pv) + '</td>' +
        '<td class="num-cell">' + fmtAnalyticsNum(r.uv) + '</td>' +
        '<td class="num-cell">' + fmtAnalyticsNum(r.pv_human) + '</td>' +
        '<td class="num-cell">' + fmtAnalyticsNum(r.pv_bot) + '</td>' +
        '<td class="num-cell">' + fmtAnalyticsNum(r.pv_desktop) + '</td>' +
        '<td class="num-cell">' + fmtAnalyticsNum(r.pv_mobile) + '</td>' +
        '<td class="num-cell">' + fmtAnalyticsNum(r.pv_tablet) + '</td>' +
        '</tr>';
    }).join('');
  }

  async function loadAnalyticsPanel(force) {
    populateAnalyticsMonthSelect();
    var statusEl = document.getElementById('analyticsStatus');
    if (!force && analyticsLoaded) return;
    if (statusEl) statusEl.textContent = '불러오는 중…';
    try {
      var range = buildAnalyticsRange();
      var data = await API.fetchAnalytics(range);
      renderAnalyticsSummary(data);
      renderAnalyticsTable(data);
      analyticsLoaded = true;
      if (statusEl) {
        statusEl.textContent = '마지막 갱신: ' + new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
        statusEl.style.color = 'var(--ink-600)';
      }
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = (err && err.message) ? err.message : String(err);
        statusEl.style.color = '#c0392b';
      }
    }
  }

  function bindAnalyticsEvents() {
    var panel = document.getElementById('panel-analytics');
    if (!panel) return;

    panel.querySelectorAll('.analytics-tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        analyticsTab = btn.dataset.analyticsTab || 'daily';
        panel.querySelectorAll('.analytics-tab-btn').forEach(function (b) {
          b.classList.toggle('active', b === btn);
          b.classList.toggle('btn-primary', b === btn);
          b.classList.toggle('btn-outline', b !== btn);
        });
        analyticsLoaded = false;
        loadAnalyticsPanel(true);
      });
    });

    panel.querySelectorAll('.analytics-days-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        analyticsDays = parseInt(btn.dataset.analyticsDays, 10) || 30;
        analyticsMonth = '';
        var monthSel = document.getElementById('analyticsMonthPick');
        if (monthSel) monthSel.value = '';
        panel.querySelectorAll('.analytics-days-btn').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        analyticsLoaded = false;
        loadAnalyticsPanel(true);
      });
    });

    var monthSel = document.getElementById('analyticsMonthPick');
    if (monthSel) {
      monthSel.addEventListener('change', function () {
        analyticsMonth = monthSel.value || '';
        if (analyticsMonth) {
          panel.querySelectorAll('.analytics-days-btn').forEach(function (b) { b.classList.remove('active'); });
        }
        analyticsLoaded = false;
        loadAnalyticsPanel(true);
      });
    }

    var refreshBtn = document.getElementById('btnRefreshAnalytics');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        analyticsLoaded = false;
        loadAnalyticsPanel(true);
      });
    }
  }

  function bindSeoPanelEvents() {
    var panel = document.getElementById('panel-seo');
    if (!panel) return;
    var ogInput = document.getElementById('seoOgImage');
    if (ogInput) ogInput.addEventListener('input', updateSeoOgPreview);
    panel.addEventListener('click', function (e) {
      if (e.target.closest('#btnGenerateSitemap')) {
        e.preventDefault();
        runGenerateSitemap();
        return;
      }
      if (e.target.closest('#btnPreviewSitemap')) {
        e.preventDefault();
        window.open('https://purpleauto.co.kr/sitemap.xml?t=' + Date.now(), '_blank');
      }
      if (e.target.closest('#btnPublishStaticSeo')) {
        e.preventDefault();
        runPublishStaticSeo(document.getElementById('seoBasicStatus')).catch(showError);
      }
      if (e.target.closest('#btnPublishStaticSeoPages')) {
        e.preventDefault();
        runPublishStaticSeo(document.getElementById('seoPagesStatus')).catch(showError);
      }
    });
  }

  function bindOptionalClick(id, handler) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
  }

  function bindEvents() {
    bindSeoPanelEvents();
    bindAnalyticsEvents();
    document.querySelectorAll('.admin-nav-item').forEach(function (item) {
      item.addEventListener('click', async function () {
        document.querySelectorAll('.admin-nav-item').forEach(function (i) { i.classList.remove('active'); });
        item.classList.add('active');
        document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
        document.getElementById('panel-' + item.dataset.panel).classList.add('active');
        var labelEl = item.querySelector('.nav-label');
        document.getElementById('topbarTitle').textContent = labelEl ? labelEl.textContent.trim() : item.textContent.trim();
        if (item.dataset.panel === 'inquiries') {
          await openInquiriesPanel();
        }
        if (item.dataset.panel === 'seo') {
          await loadSeoPanel();
        }
        if (item.dataset.panel === 'analytics') {
          await loadAnalyticsPanel();
        }
      });
    });

    document.querySelectorAll('.inquiry-tab[data-inquiry-tab]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        await switchInquiryTab(btn.dataset.inquiryTab);
      });
    });

    document.querySelectorAll('.inquiry-tab[data-seo-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setActiveSeoTab(btn.dataset.seoTab);
      });
    });

    bindOptionalClick('btnSaveSeoSettings', async function () {
      try {
        await API.saveSeoSettings({
          site_name: document.getElementById('seoSiteName').value.trim(),
          site_url: document.getElementById('seoSiteUrl').value.trim(),
          default_description: document.getElementById('seoDefaultDesc').value.trim(),
          og_image_url: document.getElementById('seoOgImage').value.trim(),
          google_verification: document.getElementById('seoGoogleVerify').value.trim(),
          naver_verification: document.getElementById('seoNaverVerify').value.trim(),
          robots_extra: document.getElementById('seoRobotsExtra').value.trim()
        });
        var patchResult = await API.queueStaticSeoPatch();
        var st = document.getElementById('seoBasicStatus');
        if (st) {
          st.textContent = '기본 설정 저장 완료 —' + seoPatchStatusSuffix(patchResult);
          st.style.color = 'var(--green-700, #15803d)';
        }
        alert('SEO 기본 설정이 저장되었습니다.');
      } catch (err) { showError(err); }
    });

    bindOptionalClick('btnSaveSeoPages', async function () {
      try {
        var rows = collectSeoPageRows();
        await API.saveSeoPageMetaRows(rows);
        seoPageData = await API.listSeoPageMeta();
        renderSeoPageCards();
        var patchResult = await API.queueStaticSeoPatch();
        var st = document.getElementById('seoPagesStatus');
        if (st) {
          st.textContent = '페이지 메타 저장 완료 —' + seoPatchStatusSuffix(patchResult);
          st.style.color = 'var(--green-700, #15803d)';
        }
        alert('페이지 메타가 저장되었습니다.');
      } catch (err) { showError(err); }
    });

    document.querySelectorAll('[data-close]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeModal(btn.dataset.close); });
    });

    document.getElementById('btnLogout').addEventListener('click', function () {
      window.PurpleAdminAuth.signOut();
    });

    document.getElementById('btnDeleteInquiries').addEventListener('click', async function () {
      var ids = [];
      document.querySelectorAll('.inquiry-check:checked').forEach(function (el) {
        ids.push(parseInt(el.value, 10));
      });
      if (!ids.length) {
        alert('삭제할 항목을 선택해 주세요.');
        return;
      }
      if (!confirm('선택한 ' + ids.length + '건을 삭제하시겠습니까?')) return;
      try {
        await API.deleteInquiries(ids);
        inquiryData = await API.listInquiries();
        inquiryTotal = inquiryData.length;
        renderInquiriesTable();
        await refreshUnifiedInquiryBadge();
      } catch (err) { showError(err); }
    });

    document.getElementById('inquiryCheckAll').addEventListener('change', function () {
      var checked = document.getElementById('inquiryCheckAll').checked;
      document.querySelectorAll('.inquiry-check').forEach(function (el) { el.checked = checked; });
    });

    document.getElementById('btnDeleteLeaseQuotes').addEventListener('click', async function () {
      var ids = [];
      document.querySelectorAll('.lease-quote-check:checked').forEach(function (el) {
        ids.push(parseInt(el.value, 10));
      });
      if (!ids.length) {
        alert('삭제할 항목을 선택해 주세요.');
        return;
      }
      if (!confirm('선택한 ' + ids.length + '건을 삭제하시겠습니까?')) return;
      try {
        await API.deleteLeaseQuotes(ids);
        leaseQuoteData = await API.listLeaseQuotes();
        renderLeaseQuotesTable();
        await refreshUnifiedInquiryBadge();
      } catch (err) { showError(err); }
    });

    document.getElementById('leaseQuoteCheckAll').addEventListener('change', function () {
      var checked = document.getElementById('leaseQuoteCheckAll').checked;
      document.querySelectorAll('.lease-quote-check').forEach(function (el) { el.checked = checked; });
    });

    document.getElementById('btnDeleteUsedCarInquiries').addEventListener('click', async function () {
      var ids = [];
      document.querySelectorAll('.used-car-inquiry-check:checked').forEach(function (el) {
        ids.push(parseInt(el.value, 10));
      });
      if (!ids.length) {
        alert('삭제할 항목을 선택해 주세요.');
        return;
      }
      if (!confirm('선택한 ' + ids.length + '건을 삭제하시겠습니까?')) return;
      try {
        await API.deleteUsedCarInquiries(ids);
        usedCarInquiryData = await API.listUsedCarInquiries();
        renderUsedCarInquiriesTable();
        await refreshUnifiedInquiryBadge();
      } catch (err) { showError(err); }
    });

    document.getElementById('usedCarInquiryCheckAll').addEventListener('change', function () {
      var checked = document.getElementById('usedCarInquiryCheckAll').checked;
      document.querySelectorAll('.used-car-inquiry-check').forEach(function (el) { el.checked = checked; });
    });

    document.getElementById('btnSyncYoutube').addEventListener('click', async function () {
      var btn = document.getElementById('btnSyncYoutube');
      if (!confirm('@purplelease 채널의 영상을 동기화하시겠습니까?\n기존 메인/추천 설정은 유지됩니다.')) return;
      btn.disabled = true;
      btn.textContent = '동기화 중…';
      try {
        var result = await API.syncYoutubeChannel();
        youtubeData = await API.listYoutube();
        renderYoutubeTable();
        alert('동기화 완료: ' + (result.count || 0) + '개 영상');
      } catch (err) {
        showError(err);
      } finally {
        btn.disabled = false;
        btn.textContent = '채널 동기화 (@purplelease)';
      }
    });

    document.getElementById('btnAddYoutube').addEventListener('click', function () {
      editingId = null;
      document.getElementById('modalYoutubeTitle').textContent = '영상 등록';
      ['ytTitle', 'ytUrl', 'ytThumb', 'ytDuration', 'ytDate'].forEach(function (id) { document.getElementById(id).value = ''; });
      openModal('modalYoutube');
    });
    document.getElementById('btnSaveYoutube').addEventListener('click', async function () {
      try {
        await API.saveYoutube({
          title: document.getElementById('ytTitle').value.trim(),
          url: document.getElementById('ytUrl').value.trim(),
          thumb: document.getElementById('ytThumb').value.trim(),
          duration: document.getElementById('ytDuration').value.trim(),
          date: document.getElementById('ytDate').value.trim()
        }, editingId);
        closeModal('modalYoutube');
        youtubeData = await API.listYoutube();
        renderYoutubeTable();
      } catch (err) { showError(err); }
    });
    document.getElementById('btnUploadYtThumb').addEventListener('click', function () {
      bindUpload('ytThumbFile', 'ytThumb', 'youtube');
    });

    document.getElementById('btnAddBlog').addEventListener('click', function () {
      editingId = null;
      document.getElementById('modalBlogTitle').textContent = '블로그 글 등록';
      ['blogTitle', 'blogUrl', 'blogThumb', 'blogDate', 'blogViewCount'].forEach(function (id) { document.getElementById(id).value = ''; });
      document.getElementById('blogViewCount').value = '0';
      openModal('modalBlog');
    });
    document.getElementById('btnSaveBlog').addEventListener('click', async function () {
      try {
        await API.saveBlog({
          title: document.getElementById('blogTitle').value.trim(),
          url: document.getElementById('blogUrl').value.trim(),
          thumb: document.getElementById('blogThumb').value.trim(),
          date: document.getElementById('blogDate').value.trim(),
          viewCount: document.getElementById('blogViewCount').value.trim()
        }, editingId);
        closeModal('modalBlog');
        blogData = await API.listBlog();
        renderBlogTable();
      } catch (err) { showError(err); }
    });
    document.getElementById('btnUploadBlogThumb').addEventListener('click', function () {
      bindUpload('blogThumbFile', 'blogThumb', 'blog');
    });

    document.getElementById('btnAddReview').addEventListener('click', function () {
      editingId = null;
      document.getElementById('modalReviewTitle').textContent = '후기 작성';
      ['reviewTitle', 'reviewBody', 'reviewDate'].forEach(function (id) { document.getElementById(id).value = ''; });
      openModal('modalReview');
    });
    document.getElementById('btnSaveReview').addEventListener('click', async function () {
      try {
        await API.saveReview({
          title: document.getElementById('reviewTitle').value.trim(),
          body: document.getElementById('reviewBody').value.trim(),
          date: document.getElementById('reviewDate').value.trim()
        }, editingId);
        closeModal('modalReview');
        reviewData = await API.listReviews();
        renderReviewTable();
      } catch (err) { showError(err); }
    });

    document.getElementById('btnAddPart').addEventListener('click', function () {
      editingId = null;
      pendingPartListingId = null;
      document.getElementById('modalPartTitle').textContent = '부품 등록';
      ['partName', 'partCategory', 'partCompatible', 'partMaker', 'partPrice', 'partPhotos', 'partTags', 'partDesc'].forEach(function (id) { document.getElementById(id).value = ''; });
      document.getElementById('partBrand').value = 'tesla';
      document.getElementById('partStock').value = '재고있음';
      document.getElementById('partPhotosFiles').value = '';
      openModal('modalPart');
    });
    document.getElementById('btnSavePart').addEventListener('click', async function () {
      try {
        var photoFiles = document.getElementById('partPhotosFiles').files;
        var listingId = editingId || pendingPartListingId || null;
        await API.savePart({
          name: document.getElementById('partName').value.trim(),
          brand: document.getElementById('partBrand').value,
          category: document.getElementById('partCategory').value.trim(),
          compatible: document.getElementById('partCompatible').value.trim(),
          maker: document.getElementById('partMaker').value.trim(),
          price: parseInt(document.getElementById('partPrice').value, 10),
          stock: document.getElementById('partStock').value,
          photos: parsePartPhotoLines(document.getElementById('partPhotos').value),
          tags: document.getElementById('partTags').value.trim(),
          description: document.getElementById('partDesc').value.trim(),
          photoFiles: photoFiles && photoFiles.length ? Array.prototype.slice.call(photoFiles) : [],
          listingId: listingId
        }, editingId);
        pendingPartListingId = null;
        closeModal('modalPart');
        partsData = await API.listParts();
        renderPartsTable();
      } catch (err) { showError(err); }
    });
    document.getElementById('btnUploadPartPhotos').addEventListener('click', async function () {
      var fileInput = document.getElementById('partPhotosFiles');
      if (!fileInput.files || !fileInput.files.length) {
        alert('업로드할 사진을 선택해 주세요.');
        return;
      }
      try {
        var listingId = editingId || pendingPartListingId || await API.getNextPartListingId();
        pendingPartListingId = listingId;
        var existing = parsePartPhotoLines(document.getElementById('partPhotos').value);
        var urls = await API.uploadPartPhotoFiles(listingId, Array.prototype.slice.call(fileInput.files), existing.length);
        appendPartPhotoUrls(urls);
        fileInput.value = '';
        alert('사진 ' + urls.length + '장이 업로드되었습니다.');
      } catch (err) { showError(err); }
    });

    document.getElementById('btnSyncSwautopia').addEventListener('click', async function () {
      var btn = document.getElementById('btnSyncSwautopia');
      if (!confirm('swautopia.co.kr 매물을 동기화하시겠습니까?\n\n사진은 4:3(목록 800×600, 상세 1280×960)으로 리사이즈 후 Supabase에 저장됩니다.\n매물·사진 수에 따라 5~15분 정도 걸릴 수 있습니다.\n판매완료·삭제된 매물은 목록에서 제외됩니다.')) return;
      btn.disabled = true;
      var prev = btn.textContent;
      btn.textContent = '동기화 중…';
      try {
        var result = await API.syncSwautopiaUsedCars(function (p) {
          if (p.phase === 'fetch') {
            btn.textContent = '매물 ' + p.count + '대 불러옴…';
          } else if (p.phase === 'image') {
            btn.textContent = '사진 처리 ' + p.carIndex + '/' + p.carTotal;
            if (p.photoIndex) btn.textContent += ' (' + p.photoIndex + '/' + p.photoTotal + ')';
          } else if (p.phase === 'save') {
            btn.textContent = 'DB 저장 중…';
          }
        });
        usedcarsData = await API.listUsedcars();
        renderUsedcarsTable();
        alert('동기화 완료: ' + (result.count || 0) + '대 반영, 비활성 ' + (result.deactivated || 0) + '대\n사진 ' + (result.photosProcessed || 0) + '장 처리');
      } catch (err) {
        showError(err);
      } finally {
        btn.disabled = false;
        btn.textContent = prev;
      }
    });

    document.getElementById('btnAddUsedcar').addEventListener('click', function () {
      editingId = null;
      document.getElementById('modalUsedcarTitle').textContent = '매물 등록';
      ['ucName', 'ucYear', 'ucMileage', 'ucPrice', 'ucThumb', 'ucBrand', 'ucSegment', 'ucFuel'].forEach(function (id) { document.getElementById(id).value = ''; });
      document.getElementById('ucStatus').value = '판매중';
      document.getElementById('ucOrigin').value = 'domestic';
      openModal('modalUsedcar');
    });
    document.getElementById('btnSaveUsedcar').addEventListener('click', async function () {
      try {
        await API.saveUsedcar({
          name: document.getElementById('ucName').value.trim(),
          year: parseInt(document.getElementById('ucYear').value, 10),
          mileage: parseInt(document.getElementById('ucMileage').value, 10) || 0,
          price: parseInt(document.getElementById('ucPrice').value, 10),
          status: document.getElementById('ucStatus').value,
          thumb: document.getElementById('ucThumb').value.trim(),
          origin: document.getElementById('ucOrigin').value,
          brand: document.getElementById('ucBrand').value.trim(),
          segment: document.getElementById('ucSegment').value.trim(),
          fuel: document.getElementById('ucFuel').value.trim()
        }, editingId);
        closeModal('modalUsedcar');
        usedcarsData = await API.listUsedcars();
        renderUsedcarsTable();
      } catch (err) { showError(err); }
    });
    document.getElementById('btnUploadUcThumb').addEventListener('click', function () {
      bindUpload('ucThumbFile', 'ucThumb', 'usedcars');
    });

    document.getElementById('btnAddLeaseBrand').addEventListener('click', async function () {
      var name = prompt('브랜드명을 입력하세요');
      if (!name) return;
      var slug = prompt('slug (영문, 예: genesis)', name.toLowerCase());
      if (!slug) return;
      try {
        await API.saveLeaseBrand({ name: name, slug: slug, origin: 'domestic', logo: '' }, null);
        leaseBrands = await API.listLeaseBrands();
        selectedLeaseBrand = slug;
        await renderLeaseBrandList();
        await renderLeaseModelArea();
      } catch (err) { showError(err); }
    });

    document.getElementById('btnSyncKsDomestic').addEventListener('click', function () {
      openKsSyncBrandModal('domestic');
    });
    document.getElementById('btnSyncKsImport').addEventListener('click', function () {
      openKsSyncBrandModal('import');
    });
    document.getElementById('btnLeaseSyncLogs').addEventListener('click', function () {
      openKsSyncLogsModal();
    });
    document.getElementById('btnKsSyncBrandPickStart').addEventListener('click', function () {
      var body = document.getElementById('modalKsSyncBrandPickBody');
      var ids = [];
      body.querySelectorAll('.ks-sync-brand-cb:checked').forEach(function (cb) {
        ids.push(parseInt(cb.value, 10));
      });
      if (!ids.length) { alert('동기화할 브랜드를 하나 이상 선택하세요.'); return; }
      closeModal('modalKsSyncBrandPick');
      runKsLeaseSync(pendingKsSyncCountry, { brandIds: ids });
    });
    document.getElementById('btnKsSyncResume').addEventListener('click', function () {
      closeModal('modalKsSync');
      if (lastKsSyncCountry) runKsLeaseSync(lastKsSyncCountry, { resume: true });
    });
  }

  async function init() {
    API = window.PurpleAdminAPI;
    if (!window.PurpleAdminAuth || !API) {
      alert('어드민 스크립트 로드 실패');
      return;
    }
    await window.PurpleAdminAuth.requireAuth();
    var email = await window.PurpleAdminAuth.getUserEmail();
    if (email) document.getElementById('adminUserEmail').textContent = email;
    bindEvents();
    try {
      await loadAll();
    } catch (err) {
      showError(err);
    }
  }

  window.PurpleAdminApp = { init: init };
})();
