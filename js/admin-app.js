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
  var leaseBrands = [];
  var selectedLeaseBrand = null;

  var partsBrandLabel = { tesla: '테슬라', benz: '벤츠', bmw: 'BMW', audi: '아우디' };

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
    document.getElementById('kpiYoutube').textContent = youtubeData.length;
    document.getElementById('kpiBlog').textContent = blogData.length;
    document.getElementById('kpiReview').textContent = reviewData.length;
    document.getElementById('kpiParts').textContent = partsData.length;
    document.getElementById('kpiUsedcars').textContent = usedcarsData.length;
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
      body.innerHTML = '<tr><td colspan="5"><div class="empty-row">등록된 블로그 글이 없습니다.</div></td></tr>';
      return;
    }
    body.innerHTML = blogData.map(function (b) {
      return '<tr>' +
        '<td class="thumb-cell"><img src="' + b.thumb + '" onerror="this.style.opacity=0.15"></td>' +
        '<td class="title-cell">' + b.title + '</td>' +
        '<td><a href="' + b.url + '" target="_blank" rel="noopener" style="color:var(--purple-600);text-decoration:underline;">바로가기</a></td>' +
        '<td class="num-cell">' + b.date + '</td>' +
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
    document.getElementById('partPrice').value = p.price;
    document.getElementById('partStock').value = p.stock;
    document.getElementById('partThumb').value = p.thumb;
    document.getElementById('partDesc').value = p.description || '';
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
        '<td class="num-cell">' + c.year + '년식</td>' +
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
    document.getElementById('ucYear').value = c.year;
    document.getElementById('ucMileage').value = c.mileage;
    document.getElementById('ucPrice').value = c.price;
    document.getElementById('ucStatus').value = c.status;
    document.getElementById('ucThumb').value = c.thumb;
    openModal('modalUsedcar');
  }

  async function deleteUsedcar(id) {
    if (!confirm('이 매물을 삭제하시겠습니까?')) return;
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
  }

  function bindEvents() {
    document.querySelectorAll('.admin-nav-item').forEach(function (item) {
      item.addEventListener('click', function () {
        document.querySelectorAll('.admin-nav-item').forEach(function (i) { i.classList.remove('active'); });
        item.classList.add('active');
        document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
        document.getElementById('panel-' + item.dataset.panel).classList.add('active');
        document.getElementById('topbarTitle').textContent = item.textContent.trim();
      });
    });

    document.querySelectorAll('[data-close]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeModal(btn.dataset.close); });
    });

    document.getElementById('btnLogout').addEventListener('click', function () {
      window.PurpleAdminAuth.signOut();
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
      ['blogTitle', 'blogUrl', 'blogThumb', 'blogDate'].forEach(function (id) { document.getElementById(id).value = ''; });
      openModal('modalBlog');
    });
    document.getElementById('btnSaveBlog').addEventListener('click', async function () {
      try {
        await API.saveBlog({
          title: document.getElementById('blogTitle').value.trim(),
          url: document.getElementById('blogUrl').value.trim(),
          thumb: document.getElementById('blogThumb').value.trim(),
          date: document.getElementById('blogDate').value.trim()
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
      document.getElementById('modalPartTitle').textContent = '부품 등록';
      ['partName', 'partCategory', 'partCompatible', 'partPrice', 'partThumb', 'partDesc'].forEach(function (id) { document.getElementById(id).value = ''; });
      document.getElementById('partBrand').value = 'tesla';
      document.getElementById('partStock').value = '재고있음';
      openModal('modalPart');
    });
    document.getElementById('btnSavePart').addEventListener('click', async function () {
      try {
        await API.savePart({
          name: document.getElementById('partName').value.trim(),
          brand: document.getElementById('partBrand').value,
          category: document.getElementById('partCategory').value.trim(),
          compatible: document.getElementById('partCompatible').value.trim(),
          price: parseInt(document.getElementById('partPrice').value, 10),
          stock: document.getElementById('partStock').value,
          thumb: document.getElementById('partThumb').value.trim(),
          description: document.getElementById('partDesc').value.trim()
        }, editingId);
        closeModal('modalPart');
        partsData = await API.listParts();
        renderPartsTable();
      } catch (err) { showError(err); }
    });
    document.getElementById('btnUploadPartThumb').addEventListener('click', function () {
      bindUpload('partThumbFile', 'partThumb', 'parts');
    });

    document.getElementById('btnAddUsedcar').addEventListener('click', function () {
      editingId = null;
      document.getElementById('modalUsedcarTitle').textContent = '매물 등록';
      ['ucName', 'ucYear', 'ucMileage', 'ucPrice', 'ucThumb'].forEach(function (id) { document.getElementById(id).value = ''; });
      document.getElementById('ucStatus').value = '판매중';
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
          thumb: document.getElementById('ucThumb').value.trim()
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
