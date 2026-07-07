/**
 * 어드민 — 제휴업체 (상단 영상 · 지역 · 해시태그 · 업체)
 */
(function () {
  'use strict';

  var API = null;
  var pageSettings = null;
  var partnerTags = [];
  var partnerRegions = [];
  var partnersList = [];
  var editingTagId = null;
  var editingRegionId = null;
  var editingPartnerId = null;
  var pendingPartnerId = null;
  var pendingGalleryImages = [];

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function escInputVal(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  function showError(err) {
    alert((err && err.message) ? err.message : String(err));
  }

  function openModal(id) { document.getElementById(id).classList.add('open'); }
  function closeModal(id) {
    document.getElementById(id).classList.remove('open');
    if (id === 'modalPartnerTag') editingTagId = null;
    if (id === 'modalPartnerRegion') editingRegionId = null;
    if (id === 'modalPartner') editingPartnerId = null;
  }

  function setActivePartnersTab(tab) {
    document.querySelectorAll('#panel-partners .inquiry-tab[data-partners-tab]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.partnersTab === tab);
    });
    document.querySelectorAll('#panel-partners .inquiry-tab-panel').forEach(function (p) { p.classList.remove('active'); });
    var map = { video: 'partnersTabVideo', regions: 'partnersTabRegions', list: 'partnersTabList' };
    var el = document.getElementById(map[tab] || 'partnersTabVideo');
    if (el) el.classList.add('active');
  }

  function fillVideoForm() {
    var s = pageSettings || {};
    var ytId = s.youtube_id || '';
    document.getElementById('partnerVideoYoutube').value = ytId
      ? (String(ytId).indexOf('youtu') >= 0 ? ytId : 'https://youtu.be/' + ytId)
      : '';
    document.getElementById('partnerVideoTitle').value = s.title || '';
    document.getElementById('partnerVideoDesc').value = s.description || '';
    document.getElementById('partnerVideoThumb').value = s.thumb_url || '';
    var preview = document.getElementById('partnerVideoThumbPreview');
    var parsedId = API.parseYoutubeVideoId ? API.parseYoutubeVideoId(ytId) : ytId;
    var thumb = s.thumb_url || (parsedId ? API.partnerYoutubeThumb(parsedId) : '');
    if (preview) {
      if (thumb) { preview.src = thumb; preview.hidden = false; }
      else { preview.hidden = true; }
    }
    var updated = document.getElementById('partnerVideoUpdatedAt');
    if (updated) updated.textContent = s.updated_at ? ('마지막 저장: ' + String(s.updated_at).replace('T', ' ').slice(0, 16)) : '';
  }

  function renderTagsTable() {
    var body = document.getElementById('partnerTagsTableBody');
    var countEl = document.getElementById('partnerTagsCount');
    if (!body) return;
    if (countEl) countEl.textContent = partnerTags.length;
    if (!partnerTags.length) {
      body.innerHTML = '<tr><td colspan="4"><div class="empty-row">등록된 해시태그가 없습니다.</div></td></tr>';
      return;
    }
    body.innerHTML = partnerTags.map(function (t) {
      return '<tr>' +
        '<td class="num-cell">' + t.sort_order + '</td>' +
        '<td><b>#' + esc(t.name) + '</b></td>' +
        '<td><span class="chip ' + (t.is_active ? 'ok' : 'muted') + '">' + (t.is_active ? '노출' : '숨김') + '</span></td>' +
        '<td class="row-actions">' +
          '<button type="button" class="btn btn-outline btn-sm" data-edit-ptag="' + t.id + '">수정</button>' +
          '<button type="button" class="btn-danger-text" data-del-ptag="' + t.id + '">삭제</button>' +
        '</td></tr>';
    }).join('');
    body.querySelectorAll('[data-edit-ptag]').forEach(function (b) {
      b.addEventListener('click', function () { editTag(parseInt(b.dataset.editPtag, 10)); });
    });
    body.querySelectorAll('[data-del-ptag]').forEach(function (b) {
      b.addEventListener('click', function () { deleteTag(parseInt(b.dataset.delPtag, 10)); });
    });
  }

  function renderRegionsTable() {
    var body = document.getElementById('partnerRegionsTableBody');
    var countEl = document.getElementById('partnerRegionsCount');
    if (!body) return;
    if (countEl) countEl.textContent = partnerRegions.length;
    if (!partnerRegions.length) {
      body.innerHTML = '<tr><td colspan="6"><div class="empty-row">등록된 지역이 없습니다.</div></td></tr>';
      return;
    }
    body.innerHTML = partnerRegions.map(function (r) {
      return '<tr>' +
        '<td class="num-cell">' + esc(r.code) + '</td>' +
        '<td><b>' + esc(r.name) + '</b></td>' +
        '<td>' + (r.sigungu ? r.sigungu.length : 0) + '개</td>' +
        '<td class="num-cell">' + r.sort_order + '</td>' +
        '<td><span class="chip ' + (r.is_active ? 'ok' : 'muted') + '">' + (r.is_active ? '노출' : '숨김') + '</span></td>' +
        '<td class="row-actions">' +
          '<button type="button" class="btn btn-outline btn-sm" data-edit-pregion="' + r.id + '">수정</button>' +
          '<button type="button" class="btn-danger-text" data-del-pregion="' + r.id + '">삭제</button>' +
        '</td></tr>';
    }).join('');
    body.querySelectorAll('[data-edit-pregion]').forEach(function (b) {
      b.addEventListener('click', function () { editRegion(parseInt(b.dataset.editPregion, 10)); });
    });
    body.querySelectorAll('[data-del-pregion]').forEach(function (b) {
      b.addEventListener('click', function () { deleteRegion(parseInt(b.dataset.delPregion, 10)); });
    });
  }

  function renderPartnersTable() {
    var body = document.getElementById('partnersAdminTableBody');
    var countEl = document.getElementById('partnersAdminCount');
    if (!body) return;
    if (countEl) countEl.textContent = partnersList.length;
    if (!partnersList.length) {
      body.innerHTML = '<tr><td colspan="8"><div class="empty-row">등록된 제휴업체가 없습니다.</div></td></tr>';
      return;
    }
    body.innerHTML = partnersList.map(function (p) {
      var thumb = '';
      if (p.gallery && p.gallery[0]) {
        thumb = p.gallery[0].thumb || p.gallery[0].url || '';
      }
      return '<tr>' +
        '<td class="thumb-cell">' + (thumb ? '<img src="' + esc(thumb) + '" onerror="this.style.opacity=0.15">' : '-') + '</td>' +
        '<td class="title-cell">' + esc(p.name) + (p.is_premium ? ' <span class="chip ok">PREMIUM</span>' : '') + '</td>' +
        '<td>' + esc(p.region + ' ' + p.sigungu) + '</td>' +
        '<td>' + esc((p.tag_names || []).map(function (t) { return '#' + t; }).join(' ')) + '</td>' +
        '<td class="num-cell">' + esc(p.phone) + '</td>' +
        '<td class="num-cell">' + p.sort_order + '</td>' +
        '<td><span class="chip ' + (p.is_active ? 'ok' : 'muted') + '">' + (p.is_active ? '노출' : '숨김') + '</span></td>' +
        '<td class="row-actions">' +
          '<button type="button" class="btn btn-outline btn-sm" data-edit-partner="' + p.id + '">수정</button>' +
          '<button type="button" class="btn-danger-text" data-del-partner="' + p.id + '">삭제</button>' +
        '</td></tr>';
    }).join('');
    body.querySelectorAll('[data-edit-partner]').forEach(function (b) {
      b.addEventListener('click', function () { editPartner(parseInt(b.dataset.editPartner, 10)); });
    });
    body.querySelectorAll('[data-del-partner]').forEach(function (b) {
      b.addEventListener('click', function () { deletePartner(parseInt(b.dataset.delPartner, 10)); });
    });
  }

  function renderPartnerPhotosPreview() {
    var wrap = document.getElementById('partnerPhotosPreview');
    if (!wrap) return;
    if (!pendingGalleryImages.length) {
      wrap.innerHTML = '<span style="font-size:12px;color:var(--ink-400);">첨부된 사진이 없습니다.</span>';
      return;
    }
    wrap.innerHTML = pendingGalleryImages.map(function (item, i) {
      return '<div style="position:relative;width:104px;flex:none;">' +
        '<img src="' + esc(item.thumb || item.url) + '" alt="" style="width:104px;height:78px;object-fit:cover;border-radius:8px;border:1px solid var(--line);background:var(--surface-alt);">' +
        '<button type="button" class="btn-danger-text btn-sm" data-del-pphoto="' + i + '" style="position:absolute;top:4px;right:4px;padding:2px 6px;font-size:10px;background:rgba(255,255,255,0.92);border-radius:6px;">✕</button>' +
      '</div>';
    }).join('');
    wrap.querySelectorAll('[data-del-pphoto]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.dataset.delPphoto, 10);
        pendingGalleryImages.splice(idx, 1);
        renderPartnerPhotosPreview();
      });
    });
  }

  function resetPartnerPhotos() {
    pendingGalleryImages = [];
    var fileInput = document.getElementById('partnerPhotosFiles');
    if (fileInput) fileInput.value = '';
    renderPartnerPhotosPreview();
  }

  function fillRegionSelects() {
    var regionSel = document.getElementById('partnerRegionName');
    if (!regionSel) return;
    var cur = regionSel.value;
    regionSel.innerHTML = '<option value="">광역시·도 선택</option>' +
      partnerRegions.filter(function (r) { return r.is_active; }).map(function (r) {
        return '<option value="' + escInputVal(r.name) + '">' + esc(r.name) + '</option>';
      }).join('');
    if (cur) regionSel.value = cur;
    updateSigunguSelect();
  }

  function updateSigunguSelect() {
    var regionSel = document.getElementById('partnerRegionName');
    var sigunguSel = document.getElementById('partnerSigungu');
    if (!regionSel || !sigunguSel) return;
    var regionName = regionSel.value;
    var matched = partnerRegions.find(function (r) { return r.name === regionName; });
    var cur = sigunguSel.value;
    sigunguSel.innerHTML = '<option value="">시·군·구 선택</option>';
    if (matched && matched.sigungu) {
      matched.sigungu.forEach(function (g) {
        sigunguSel.innerHTML += '<option value="' + escInputVal(g) + '">' + esc(g) + '</option>';
      });
    }
    if (cur) sigunguSel.value = cur;
  }

  function fillTagCheckboxes(selected) {
    var wrap = document.getElementById('partnerTagChecks');
    if (!wrap) return;
    var sel = selected || [];
    wrap.innerHTML = partnerTags.filter(function (t) { return t.is_active; }).map(function (t) {
      var checked = sel.indexOf(t.name) >= 0 ? ' checked' : '';
      return '<label style="display:inline-flex;align-items:center;gap:6px;margin:0 10px 8px 0;font-size:13px;">' +
        '<input type="checkbox" value="' + escInputVal(t.name) + '"' + checked + '> #' + esc(t.name) +
      '</label>';
    }).join('');
  }

  function editTag(id) {
    var t = partnerTags.find(function (x) { return x.id === id; });
    if (!t) return;
    editingTagId = id;
    document.getElementById('modalPartnerTagTitle').textContent = '해시태그 수정';
    document.getElementById('partnerTagName').value = t.name;
    document.getElementById('partnerTagSort').value = t.sort_order;
    document.getElementById('partnerTagActive').checked = !!t.is_active;
    openModal('modalPartnerTag');
  }

  function editRegion(id) {
    var r = partnerRegions.find(function (x) { return x.id === id; });
    if (!r) return;
    editingRegionId = id;
    document.getElementById('modalPartnerRegionTitle').textContent = '지역 수정';
    document.getElementById('partnerRegionCode').value = r.code;
    document.getElementById('partnerRegionCode').readOnly = true;
    document.getElementById('partnerRegionNameInput').value = r.name;
    document.getElementById('partnerRegionSigungu').value = (r.sigungu || []).join('\n');
    document.getElementById('partnerRegionSort').value = r.sort_order;
    document.getElementById('partnerRegionActive').checked = !!r.is_active;
    openModal('modalPartnerRegion');
  }

  function editPartner(id) {
    var p = partnersList.find(function (x) { return x.id === id; });
    if (!p) return;
    editingPartnerId = id;
    document.getElementById('modalPartnerTitle').textContent = '제휴업체 수정';
    document.getElementById('partnerName').value = p.name;
    document.getElementById('partnerRegionName').value = p.region;
    updateSigunguSelect();
    document.getElementById('partnerSigungu').value = p.sigungu;
    document.getElementById('partnerAddress').value = p.address;
    document.getElementById('partnerShortDesc').value = p.short_desc;
    document.getElementById('partnerPhone').value = p.phone;
    document.getElementById('partnerVideoId').value = p.video_youtube_id || '';
    pendingGalleryImages = API.galleryImageItems(p.gallery).slice();
    renderPartnerPhotosPreview();
    document.getElementById('partnerBodyHtml').value = p.body_html || '';
    document.getElementById('partnerSortOrder').value = p.sort_order;
    document.getElementById('partnerPremium').checked = !!p.is_premium;
    document.getElementById('partnerActive').checked = !!p.is_active;
    fillTagCheckboxes(p.tag_names || []);
    openModal('modalPartner');
  }

  async function deleteTag(id) {
    if (!confirm('이 해시태그를 삭제하시겠습니까?')) return;
    try {
      await API.deletePartnerTag(id);
      await reload();
    } catch (err) { showError(err); }
  }

  async function deleteRegion(id) {
    if (!confirm('이 지역을 삭제하시겠습니까?')) return;
    try {
      await API.deletePartnerRegion(id);
      await reload();
    } catch (err) { showError(err); }
  }

  async function deletePartner(id) {
    if (!confirm('이 제휴업체를 삭제하시겠습니까?')) return;
    try {
      await API.deletePartner(id);
      await reload();
    } catch (err) { showError(err); }
  }

  async function saveVideoForm(e) {
    if (e) e.preventDefault();
    var status = document.getElementById('partnerVideoSaveStatus');
    if (status) status.textContent = '저장 중…';
    try {
      pageSettings = await API.savePartnerPageSettings({
        youtube_id: document.getElementById('partnerVideoYoutube').value,
        title: document.getElementById('partnerVideoTitle').value,
        description: document.getElementById('partnerVideoDesc').value,
        thumb_url: document.getElementById('partnerVideoThumb').value
      });
      fillVideoForm();
      if (status) status.textContent = '저장되었습니다. 공개 페이지에 즉시 반영됩니다.';
    } catch (err) {
      if (status) status.textContent = '';
      showError(err);
    }
  }

  async function saveTagForm() {
    try {
      await API.savePartnerTag({
        name: document.getElementById('partnerTagName').value,
        sort_order: document.getElementById('partnerTagSort').value,
        is_active: document.getElementById('partnerTagActive').checked
      }, editingTagId);
      closeModal('modalPartnerTag');
      await reload();
    } catch (err) { showError(err); }
  }

  async function saveRegionForm() {
    try {
      await API.savePartnerRegion({
        code: document.getElementById('partnerRegionCode').value,
        name: document.getElementById('partnerRegionNameInput').value,
        sigungu: document.getElementById('partnerRegionSigungu').value,
        sort_order: document.getElementById('partnerRegionSort').value,
        is_active: document.getElementById('partnerRegionActive').checked
      }, editingRegionId);
      closeModal('modalPartnerRegion');
      await reload();
    } catch (err) { showError(err); }
  }

  function getSelectedPartnerTags() {
    var out = [];
    document.querySelectorAll('#partnerTagChecks input[type="checkbox"]:checked').forEach(function (cb) {
      out.push(cb.value);
    });
    return out;
  }

  async function savePartnerForm() {
    try {
      var photoInput = document.getElementById('partnerPhotosFiles');
      var photoFiles = photoInput && photoInput.files && photoInput.files.length
        ? Array.prototype.slice.call(photoInput.files) : [];
      var partnerId = editingPartnerId || pendingPartnerId || null;
      await API.savePartner({
        name: document.getElementById('partnerName').value,
        region: document.getElementById('partnerRegionName').value,
        sigungu: document.getElementById('partnerSigungu').value,
        address: document.getElementById('partnerAddress').value,
        short_desc: document.getElementById('partnerShortDesc').value,
        phone: document.getElementById('partnerPhone').value,
        video_youtube_id: document.getElementById('partnerVideoId').value,
        gallery_images: pendingGalleryImages.slice(),
        photoFiles: photoFiles,
        partnerId: partnerId,
        body_html: document.getElementById('partnerBodyHtml').value,
        sort_order: document.getElementById('partnerSortOrder').value,
        is_premium: document.getElementById('partnerPremium').checked,
        is_active: document.getElementById('partnerActive').checked,
        tag_names: getSelectedPartnerTags()
      }, editingPartnerId);
      pendingPartnerId = null;
      closeModal('modalPartner');
      await reload();
    } catch (err) { showError(err); }
  }

  async function uploadPartnerPhotos() {
    var fileInput = document.getElementById('partnerPhotosFiles');
    if (!fileInput || !fileInput.files || !fileInput.files.length) {
      alert('업로드할 사진을 선택해 주세요.');
      return;
    }
    try {
      var partnerId = editingPartnerId || pendingPartnerId || await API.getNextPartnerId();
      pendingPartnerId = partnerId;
      var uploaded = await API.uploadPartnerPhotoFiles(
        partnerId,
        Array.prototype.slice.call(fileInput.files),
        pendingGalleryImages.length
      );
      pendingGalleryImages = pendingGalleryImages.concat(uploaded);
      fileInput.value = '';
      renderPartnerPhotosPreview();
      alert('사진 ' + uploaded.length + '장이 업로드되었습니다. (가로 1280px 리사이즈)');
    } catch (err) { showError(err); }
  }

  async function reload() {
    pageSettings = await API.getPartnerPageSettings();
    partnerTags = await API.listPartnerTagsAdmin();
    partnerRegions = await API.listPartnerRegionsAdmin();
    partnersList = await API.listPartnersAdmin();
    fillVideoForm();
    renderTagsTable();
    renderRegionsTable();
    renderPartnersTable();
    fillRegionSelects();
  }

  function bindEvents() {
    document.querySelectorAll('#panel-partners .inquiry-tab[data-partners-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setActivePartnersTab(btn.dataset.partnersTab);
      });
    });

    var videoForm = document.getElementById('partnerVideoForm');
    if (videoForm) videoForm.addEventListener('submit', saveVideoForm);

    var btnAddTag = document.getElementById('btnAddPartnerTag');
    if (btnAddTag) {
      btnAddTag.addEventListener('click', function () {
        editingTagId = null;
        document.getElementById('modalPartnerTagTitle').textContent = '해시태그 추가';
        document.getElementById('partnerTagName').value = '';
        document.getElementById('partnerTagSort').value = partnerTags.length + 1;
        document.getElementById('partnerTagActive').checked = true;
        openModal('modalPartnerTag');
      });
    }

    var btnSaveTag = document.getElementById('btnSavePartnerTag');
    if (btnSaveTag) btnSaveTag.addEventListener('click', saveTagForm);

    var btnAddRegion = document.getElementById('btnAddPartnerRegion');
    if (btnAddRegion) {
      btnAddRegion.addEventListener('click', function () {
        editingRegionId = null;
        document.getElementById('modalPartnerRegionTitle').textContent = '지역 추가';
        document.getElementById('partnerRegionCode').value = '';
        document.getElementById('partnerRegionCode').readOnly = false;
        document.getElementById('partnerRegionNameInput').value = '';
        document.getElementById('partnerRegionSigungu').value = '';
        document.getElementById('partnerRegionSort').value = partnerRegions.length + 1;
        document.getElementById('partnerRegionActive').checked = true;
        openModal('modalPartnerRegion');
      });
    }

    var btnSaveRegion = document.getElementById('btnSavePartnerRegion');
    if (btnSaveRegion) btnSaveRegion.addEventListener('click', saveRegionForm);

    var btnAddPartner = document.getElementById('btnAddPartner');
    if (btnAddPartner) {
      btnAddPartner.addEventListener('click', function () {
        editingPartnerId = null;
        pendingPartnerId = null;
        document.getElementById('modalPartnerTitle').textContent = '제휴업체 등록';
        document.getElementById('partnerName').value = '';
        document.getElementById('partnerRegionName').value = '';
        document.getElementById('partnerSigungu').value = '';
        document.getElementById('partnerAddress').value = '';
        document.getElementById('partnerShortDesc').value = '';
        document.getElementById('partnerPhone').value = '';
        document.getElementById('partnerVideoId').value = '';
        resetPartnerPhotos();
        document.getElementById('partnerBodyHtml').value = '';
        document.getElementById('partnerSortOrder').value = partnersList.length + 1;
        document.getElementById('partnerPremium').checked = false;
        document.getElementById('partnerActive').checked = true;
        fillRegionSelects();
        fillTagCheckboxes([]);
        openModal('modalPartner');
      });
    }

    var regionSel = document.getElementById('partnerRegionName');
    if (regionSel) regionSel.addEventListener('change', updateSigunguSelect);

    var btnSavePartner = document.getElementById('btnSavePartner');
    if (btnSavePartner) btnSavePartner.addEventListener('click', savePartnerForm);

    var btnUploadPartnerPhotos = document.getElementById('btnUploadPartnerPhotos');
    if (btnUploadPartnerPhotos) btnUploadPartnerPhotos.addEventListener('click', uploadPartnerPhotos);

    var ytInput = document.getElementById('partnerVideoYoutube');
    if (ytInput) {
      ytInput.addEventListener('input', function () {
        var preview = document.getElementById('partnerVideoThumbPreview');
        var thumbField = document.getElementById('partnerVideoThumb');
        if (!preview || thumbField.value) return;
        var id = API.parseYoutubeVideoId ? API.parseYoutubeVideoId(ytInput.value.trim()) : '';
        if (id) {
          preview.src = API.partnerYoutubeThumb(id);
          preview.hidden = false;
        }
      });
    }
  }

  async function load() {
    await reload();
  }

  function init(api) {
    API = api;
    bindEvents();
  }

  window.PurpleAdminPartners = { init: init, load: load };
})();
