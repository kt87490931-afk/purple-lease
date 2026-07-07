/**
 * 제휴업체 상세
 */
(function () {
  'use strict';

  var dataApi = window.PurplePartnersData;
  if (!dataApi) return;

  var params = new URLSearchParams(window.location.search);
  var id = params.get('id');
  var partner = null;
  var mediaIdx = 0;

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function telHref(phone) {
    var digits = String(phone || '').replace(/[^\d+]/g, '');
    return digits ? 'tel:' + digits : 'tel:1555-6362';
  }

  function showNotFound() {
    document.getElementById('pdContent').style.display = 'none';
    document.getElementById('pdNotFound').style.display = 'block';
    document.title = '제휴업체를 찾을 수 없습니다 | 퍼플오토';
  }

  function renderGallery() {
    var gallery = partner.gallery || [];
    var main = document.getElementById('pdGalleryMain');
    var thumbs = document.getElementById('pdGalleryThumbs');
    var counter = document.getElementById('pdGalleryCounter');
    var btnPrev = document.getElementById('pdBtnPrev');
    var btnNext = document.getElementById('pdBtnNext');

    if (!gallery.length) {
      main.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#9494A3;">이미지 없음</div>';
      thumbs.innerHTML = '';
      return;
    }

    function renderMain() {
      var item = gallery[mediaIdx];
      if (item.type === 'video') {
        main.innerHTML = '<iframe src="' + esc(dataApi.youtubeEmbedUrl(item.youtube_id)) + '" title="' + esc(partner.name) + ' 소개 영상" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
      } else {
        main.innerHTML = '<img src="' + esc(item.url) + '" alt="' + esc(partner.name) + '">';
      }
      counter.textContent = (mediaIdx + 1) + ' / ' + gallery.length;
      thumbs.querySelectorAll('.pd-gthumb').forEach(function (t, i) {
        t.classList.toggle('active', i === mediaIdx);
      });
      btnPrev.disabled = gallery.length <= 1;
      btnNext.disabled = gallery.length <= 1;
    }

    thumbs.innerHTML = gallery.map(function (item, i) {
      var thumb = item.thumb || item.url || dataApi.PLACEHOLDER_THUMB;
      var badge = item.type === 'video' ? '▶ 영상' : '📷 사진';
      return '<button type="button" class="pd-gthumb' + (i === 0 ? ' active' : '') + '" data-idx="' + i + '">' +
        '<img src="' + esc(thumb) + '" alt="">' +
        '<span class="pd-gthumb-badge">' + badge + '</span>' +
      '</button>';
    }).join('');

    thumbs.querySelectorAll('.pd-gthumb').forEach(function (btn) {
      btn.addEventListener('click', function () {
        mediaIdx = parseInt(btn.dataset.idx, 10);
        renderMain();
      });
    });

    btnPrev.addEventListener('click', function () {
      mediaIdx = (mediaIdx - 1 + gallery.length) % gallery.length;
      renderMain();
    });
    btnNext.addEventListener('click', function () {
      mediaIdx = (mediaIdx + 1) % gallery.length;
      renderMain();
    });

    renderMain();
  }

  function renderPage() {
    if (!partner) {
      showNotFound();
      return;
    }

    document.title = partner.name + ' | 제휴업체 | 퍼플오토';
    document.getElementById('crumbName').textContent = partner.name;

    var sideBox = document.getElementById('pdSideBox');
    if (partner.is_premium) sideBox.classList.add('is-premium');

    document.getElementById('pdTitle').textContent = partner.name;
    document.getElementById('pdDesc').textContent = partner.desc;
    document.getElementById('pdRegionPill').textContent = partner.region + ' ' + partner.sigungu;
    document.getElementById('pdAddress').textContent = partner.address;
    document.getElementById('pdPhone').textContent = partner.phone;

    var premiumPill = document.getElementById('pdPremiumPill');
    if (partner.is_premium) premiumPill.style.display = 'inline-flex';
    else premiumPill.style.display = 'none';

    document.getElementById('pdTags').innerHTML = (partner.tags || []).map(function (t) {
      return '<span class="pd-tag">#' + esc(t) + '</span>';
    }).join('');

    document.getElementById('pdInfoTable').innerHTML =
      '<div class="pd-info-row"><dt>업체명</dt><dd>' + esc(partner.name) + '</dd></div>' +
      '<div class="pd-info-row"><dt>지역</dt><dd>' + esc(partner.region + ' ' + partner.sigungu) + '</dd></div>' +
      '<div class="pd-info-row"><dt>주소</dt><dd>' + esc(partner.address) + '</dd></div>' +
      '<div class="pd-info-row"><dt>연락처</dt><dd>' + esc(partner.phone) + '</dd></div>' +
      '<div class="pd-info-row"><dt>분류</dt><dd>' + esc((partner.tags || []).map(function (t) { return '#' + t; }).join(' ')) + '</dd></div>';

    document.getElementById('pdBody').innerHTML = partner.body_html || '';

    var phoneHref = telHref(partner.phone);
    ['pdBtnCall', 'pdBtnCallMobile'].forEach(function (bid) {
      var el = document.getElementById(bid);
      if (el) el.addEventListener('click', function () { window.location.href = phoneHref; });
    });
    ['pdBtnPurple', 'pdBtnPurpleMobile'].forEach(function (bid) {
      var el = document.getElementById(bid);
      if (el) el.addEventListener('click', function () { window.location.href = 'tel:15556362'; });
    });

    renderGallery();
  }

  document.addEventListener('DOMContentLoaded', function () {
    dataApi.ensureLoaded().then(function () {
      partner = dataApi.getPartnerById(id);
      renderPage();
    });
  });
})();
