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
  var leaseBrands = [];
  var selectedLeaseBrand = null;

  var pendingPartListingId = null;

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
    document.getElementById('kpiYoutube').textContent = youtubeData.length;
    document.getElementById('kpiBlog').textContent = blogData.length;
    document.getElementById('kpiReview').textContent = reviewData.length;
    document.getElementById('kpiParts').textContent = partsData.length;
    document.getElementById('kpiUsedcars').textContent = usedcarsData.length;
  }

  function updateInquiryBadge(count) {
    inquiryUnread = Math.max(0, parseInt(count, 10) || 0);
    var badge = document.getElementById('inquiryNavBadge');
    if (!badge) return;
    if (inquiryUnread >= 1) {
      badge.textContent = inquiryUnread > 99 ? '99+' : String(inquiryUnread);
      badge.style.display = 'inline-flex';
      badge.hidden = false;
    } else {
      badge.textContent = '';
      badge.style.display = 'none';
      badge.hidden = true;
    }
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
      var n = await API.countUnreadInquiries();
      updateInquiryBadge(n);
      inquiryTotal = await API.countTotalInquiries();
      updateKpis();
    } catch (err) {
      console.warn('[Admin] inquiry badge:', err);
    }
  }

  async function openInquiriesPanel() {
    try {
      await API.markAllInquiriesRead();
      updateInquiryBadge(0);
      inquiryData = await API.listInquiries();
      inquiryTotal = inquiryData.length;
      renderInquiriesTable();
      updateKpis();
    } catch (err) {
      showError(err);
    }
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

  function renderBlogTable() {
    var body = document.getElementById('blogTableBody');
    document.getElementById('blogCount').textContent = blogData.length;
    if (!blogData.length) {
      body.innerHTML = '<tr><td colspan="6"><div class="empty-row">등록된 블로그 글이 없습니다.</div></td></tr>';
      return;
    }
    body.innerHTML = blogData.map(function (b) {
      return '<tr>' +
        '<td class="thumb-cell"><img src="' + b.thumb + '" onerror="this.style.opacity=0.15"></td>' +
        '<td class="title-cell">' + b.title + '</td>' +
        '<td><a href="' + b.url + '" target="_blank" rel="noopener" style="color:var(--purple-600);text-decoration:underline;">바로가기</a></td>' +
        '<td class="num-cell">' + b.date + '</td>' +
        '<td class="num-cell">' + (b.viewCount || 0).toLocaleString('ko-KR') + '</td>' +
        '<td class="row-actions"><button class="btn btn-outline btn-sm" data-edit-blog="' + b.id + '">수정</button>' +
        '<button class="btn-danger-text" data-del-blog="' + b.id + '">삭제</button></td></tr>';
    }).join('');
    body.querySelectorAll('[data-edit-blog]').forEach(function (b) {
      b.addEventListener('click', function () { editBlog(parseInt(b.dataset.editBlog, 10)); });
    });
    body.querySelectorAll('[data-del-blog]').forEach(function (b) {
      b.addEventListener('click', function () { deleteBlog(parseInt(b.dataset.delBlog, 10)); });
    });
    updateKpis();
  }

  function editBlog(id) {
    var b = blogData.find(function (x) { return x.id === id; });
    editingId = id;
    document.getElementById('modalBlogTitle').textContent = '블로그 글 수정';
    document.getElementById('blogTitle').value = b.title;
    document.getElementById('blogUrl').value = b.url;
    document.getElementById('blogThumb').value = b.thumb;
    document.getElementById('blogDate').value = b.date;
    document.getElementById('blogViewCount').value = b.viewCount || 0;
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

  async function renderLeaseBrandList() {
    var list = document.getElementById('leaseBrandList');
    list.innerHTML = leaseBrands.map(function (b) {
      return '<div class="tree-item' + (b.id === selectedLeaseBrand ? ' active' : '') + '" data-brand="' + b.id + '">' + b.name + '</div>';
    }).join('');
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
        return '<tr><td class="title-cell">' + m.name + '</td><td class="num-cell">' + m.priceFrom + '~' + m.priceTo + '</td>' +
          '<td class="row-actions"><button class="btn btn-outline btn-sm" disabled>트림/옵션(준비중)</button>' +
          '<button class="btn-danger-text" data-del-model="' + m.dbId + '">삭제</button></td></tr>';
      }).join('') +
      '</tbody></table>' +
      '<p style="font-size:11.5px;color:var(--ink-400);margin-top:10px;">트림·옵션·색상 상세는 estimate.html config_json 연동으로 확장 예정입니다.</p>';

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

  async function loadAll() {
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
    await refreshInquiryBadge();
  }

  function bindEvents() {
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
      });
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
        await refreshInquiryBadge();
      } catch (err) { showError(err); }
    });

    document.getElementById('inquiryCheckAll').addEventListener('change', function () {
      var checked = document.getElementById('inquiryCheckAll').checked;
      document.querySelectorAll('.inquiry-check').forEach(function (el) { el.checked = checked; });
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
