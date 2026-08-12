/**
 * PC 플로팅 견적문의 배너 — 우측 중앙 고정 (1025px+)
 * 상담 접수: PurpleLeaseData.submitInquiry (inquiries 테이블)
 */
(function () {
  'use strict';

  var FALLBACK = {
    phone_number: '1555-6362',
    kakao_url: 'https://pf.kakao.com/_vyvHG/chat'
  };

  var BANNER_HTML =
    '<div class="pa-float" id="paFloat" style="position:fixed;right:28px;top:50%;z-index:9990;max-width:268px;overflow:hidden;visibility:hidden">' +
      '<div class="pa-tab" id="paTab" role="button" tabindex="0" aria-label="빠른 견적문의 펼치기">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
          '<path d="M4 17V9L12 3L20 9V17" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<path d="M9 21V13H15V21" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>' +
        '<span>빠른 견적문의</span>' +
      '</div>' +
      '<div class="pa-card" id="paCard">' +
        '<div class="pa-header">' +
          '<div class="pa-header-top">' +
            '<div class="pa-badge">' +
              '<div class="pa-badge-icon">' +
                '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
                  '<rect x="3" y="6" width="18" height="12" rx="2" stroke="#fff" stroke-width="2"/>' +
                  '<path d="M7 6V4H17V6" stroke="#fff" stroke-width="2"/>' +
                '</svg>' +
              '</div>' +
              '<div class="pa-title">빠른 견적문의</div>' +
            '</div>' +
            '<div class="pa-controls">' +
              '<button type="button" class="pa-icon-btn" id="paMinimize" title="최소화" aria-label="최소화">—</button>' +
              '<button type="button" class="pa-icon-btn" id="paClose" title="닫기" aria-label="닫기">✕</button>' +
            '</div>' +
          '</div>' +
          '<div class="pa-sub">1분이면 충분해요, 지금 바로 확인하세요</div>' +
        '</div>' +
        '<div class="pa-body">' +
          '<input class="pa-field" id="paName" type="text" placeholder="성함 *" autocomplete="name">' +
          '<input class="pa-field" id="paCar" type="text" placeholder="차종">' +
          '<input class="pa-field" id="paPhone" type="tel" placeholder="연락처 * ex) 01012341234" autocomplete="tel">' +
          '<div class="pa-label-row">상담유형</div>' +
          '<div class="pa-radio-group" id="paConsultTypeGroup">' +
            '<label class="pa-radio checked"><input type="radio" name="paConsultType" value="lease_rent" checked>리스·렌트</label>' +
            '<label class="pa-radio"><input type="radio" name="paConsultType" value="paid_transfer">완납승계</label>' +
            '<label class="pa-radio"><input type="radio" name="paConsultType" value="used_car">중고차</label>' +
          '</div>' +
          '<div class="pa-label-row">견적안내방법</div>' +
          '<div class="pa-radio-group" id="paContactGroup">' +
            '<label class="pa-radio checked"><input type="radio" name="paContact" value="전화" checked>전화</label>' +
            '<label class="pa-radio"><input type="radio" name="paContact" value="문자">문자</label>' +
            '<label class="pa-radio"><input type="radio" name="paContact" value="카톡">카톡</label>' +
          '</div>' +
          '<label class="pa-consent">' +
            '<input type="checkbox" id="paConsent" checked>' +
            '<span>개인정보 수집·이용·제공 동의<a href="#">[보기]</a></span>' +
          '</label>' +
          '<button type="button" class="pa-submit" id="paSubmit">상담신청하기</button>' +
        '</div>' +
        '<div class="pa-divider"></div>' +
        '<div class="pa-quick">' +
          '<a class="pa-quick-item" id="paQuickTel" href="tel:15556362">' +
            '<div class="pa-quick-icon">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
                '<path d="M6.6 10.8C7.9 13.4 10.6 16 13.2 17.4L15.2 15.4C15.5 15.1 15.9 15 16.3 15.2C17.5 15.6 18.8 15.8 20 15.8C20.6 15.8 21 16.2 21 16.8V20C21 20.6 20.6 21 20 21C10.6 21 3 13.4 3 4C3 3.4 3.4 3 4 3H7.2C7.8 3 8.2 3.4 8.2 4C8.2 5.2 8.4 6.5 8.8 7.7C8.9 8.1 8.9 8.5 8.6 8.8L6.6 10.8Z" stroke="#1A1E6E" stroke-width="1.8"/>' +
              '</svg>' +
            '</div>' +
            '<div>' +
              '<div class="pa-quick-text-label">전문상담원과 전화상담</div>' +
              '<div class="pa-quick-text-value" id="paPhoneDisplay">1555-6362</div>' +
            '</div>' +
          '</a>' +
          '<a class="pa-quick-item" id="paQuickKakao" href="https://pf.kakao.com/_vyvHG/chat" target="_blank" rel="noopener noreferrer">' +
            '<div class="pa-quick-icon">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
                '<path d="M12 3C6.5 3 2 6.6 2 11C2 13.8 3.9 16.3 6.8 17.7L5.8 21L9.7 18.7C10.4 18.9 11.2 19 12 19C17.5 19 22 15.4 22 11C22 6.6 17.5 3 12 3Z" fill="#1A1E6E"/>' +
              '</svg>' +
            '</div>' +
            '<div>' +
              '<div class="pa-quick-text-label">빠르고 편한</div>' +
              '<div class="pa-quick-text-value text-only">카카오톡 상담</div>' +
            '</div>' +
          '</a>' +
          '<a class="pa-quick-item" id="paQuickEstimate" href="/estimate">' +
            '<div class="pa-quick-icon">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
                '<rect x="3" y="4" width="18" height="17" rx="2" stroke="#1A1E6E" stroke-width="1.8"/>' +
                '<path d="M3 9H21" stroke="#1A1E6E" stroke-width="1.8"/>' +
                '<path d="M7 13H9M12 13H14M17 13H17.01M7 17H9M12 17H14" stroke="#1A1E6E" stroke-width="1.8" stroke-linecap="round"/>' +
              '</svg>' +
            '</div>' +
            '<div>' +
              '<div class="pa-quick-text-label">차량견적이 궁금할땐</div>' +
              '<div class="pa-quick-text-value text-only">간편 견적기</div>' +
            '</div>' +
          '</a>' +
        '</div>' +
      '</div>' +
    '</div>';

  function mergeSettings(row) {
    var cfg = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.floatConsultDefaults) || {};
    return Object.assign({}, FALLBACK, cfg, row || {});
  }

  async function fetchConsultSettings() {
    var cfg = window.SUPABASE_CONFIG;
    if (!cfg || !cfg.url || !cfg.anonKey) return mergeSettings(null);
    try {
      var url = cfg.url.replace(/\/$/, '') + '/rest/v1/float_consult_settings?id=eq.1&select=*';
      var res = await fetch(url, {
        headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey }
      });
      if (!res.ok) return mergeSettings(null);
      var rows = await res.json();
      return mergeSettings(rows && rows[0] ? rows[0] : null);
    } catch (e) {
      console.warn('[floating-quote-banner]', e);
      return mergeSettings(null);
    }
  }

  function telHref(phone) {
    var digits = String(phone || '').replace(/[^\d+]/g, '');
    return digits ? 'tel:' + digits : 'tel:15556362';
  }

  function normalizeKakaoUrl(url) {
    var s = String(url || '').trim();
    if (!s) return FALLBACK.kakao_url;
    var m = s.match(/pf\.kakao\.com\/[^/?#]+(?:\/chat)?/i);
    if (m) {
      var path = m[0];
      if (path.indexOf('/chat') < 0) path += '/chat';
      return 'https://' + path.replace(/^https?:\/\//i, '');
    }
    return s;
  }

  function getSourcePage() {
    var path = (location.pathname || '/').replace(/\/+$/, '') || '/';
    if (path === '/' || path === '/index.html') return 'index';
    var slug = path.split('/').filter(Boolean)[0] || 'index';
    return slug.replace(/\.html$/, '');
  }

  function getSelectedContactMethod(floatEl) {
    var checked = floatEl.querySelector('#paContactGroup .pa-radio.checked input[name="paContact"]')
      || floatEl.querySelector('input[name="paContact"]:checked');
    return checked ? checked.value : '전화';
  }

  function getSelectedConsultType(floatEl) {
    var checked = floatEl.querySelector('#paConsultTypeGroup .pa-radio.checked input[name="paConsultType"]')
      || floatEl.querySelector('input[name="paConsultType"]:checked');
    var v = checked ? checked.value : 'lease_rent';
    if (v === 'paid_transfer' || v === 'used_car' || v === 'lease_rent') return v;
    return 'lease_rent';
  }

  function applyQuickLinks(settings) {
    var phone = settings.phone_number || FALLBACK.phone_number;
    var kakao = normalizeKakaoUrl(settings.kakao_url);
    var telLink = document.getElementById('paQuickTel');
    var phoneDisplay = document.getElementById('paPhoneDisplay');
    var kakaoLink = document.getElementById('paQuickKakao');
    if (telLink) telLink.href = telHref(phone);
    if (phoneDisplay) phoneDisplay.textContent = phone;
    if (kakaoLink) kakaoLink.href = kakao;
  }

  function bindUi(floatEl) {
    var tab = floatEl.querySelector('#paTab');
    var minimize = floatEl.querySelector('#paMinimize');
    var closeBtn = floatEl.querySelector('#paClose');
    var submitBtn = floatEl.querySelector('#paSubmit');

    minimize.addEventListener('click', function () {
      floatEl.classList.add('collapsed');
    });

    function expand() {
      floatEl.classList.remove('collapsed');
    }

    tab.addEventListener('click', expand);
    tab.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        expand();
      }
    });

    closeBtn.addEventListener('click', function () {
      floatEl.style.display = 'none';
    });

    floatEl.querySelectorAll('.pa-radio-group').forEach(function (group) {
      group.querySelectorAll('.pa-radio').forEach(function (label) {
        label.addEventListener('click', function () {
          group.querySelectorAll('.pa-radio').forEach(function (l) { l.classList.remove('checked'); });
          label.classList.add('checked');
          var input = label.querySelector('input');
          if (input) input.checked = true;
        });
      });
    });

    submitBtn.addEventListener('click', function () {
      handleSubmit(floatEl, submitBtn);
    });
  }

  async function handleSubmit(floatEl, btn) {
    var name = (document.getElementById('paName').value || '').trim();
    var car = (document.getElementById('paCar').value || '').trim();
    var phone = (document.getElementById('paPhone').value || '').trim();
    var consent = document.getElementById('paConsent').checked;
    var contactMethod = getSelectedContactMethod(floatEl);
    var consultType = getSelectedConsultType(floatEl);

    if (!name) {
      alert('성함을 입력해 주세요.');
      document.getElementById('paName').focus();
      return;
    }
    if (!phone) {
      alert('연락처를 입력해 주세요.');
      document.getElementById('paPhone').focus();
      return;
    }
    if (!consent) {
      alert('개인정보 수집·이용·제공에 동의해 주세요.');
      return;
    }
    if (!window.PurpleLeaseData || !window.PurpleLeaseData.isConfigured()) {
      alert('현재 견적 접수를 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    btn.disabled = true;
    var prevText = btn.textContent;
    btn.textContent = '접수 중…';

    try {
      await window.PurpleLeaseData.submitInquiry({
        name: name,
        phone: phone,
        brand: car,
        usage_method: contactMethod,
        consult_type: consultType,
        source_page: 'float-banner:' + getSourcePage()
      });
      alert('무료 견적 신청이 접수되었습니다.\n담당 플래너가 곧 연락드리겠습니다.');
      document.getElementById('paName').value = '';
      document.getElementById('paCar').value = '';
      document.getElementById('paPhone').value = '';
      document.getElementById('paConsent').checked = true;
      var typeGroup = floatEl.querySelector('#paConsultTypeGroup');
      if (typeGroup) {
        typeGroup.querySelectorAll('.pa-radio').forEach(function (l) {
          var on = l.querySelector('input') && l.querySelector('input').value === 'lease_rent';
          l.classList.toggle('checked', on);
          var inp = l.querySelector('input');
          if (inp) inp.checked = on;
        });
      }
    } catch (err) {
      console.warn('[floating-quote-banner] submit failed:', err);
      alert('접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      btn.disabled = false;
      btn.textContent = prevText;
    }
  }

  async function bootstrap() {
    if (document.body.dataset.noFloatQuoteBanner === '1') return;
    if (document.getElementById('paFloat')) return;

    var wrap = document.createElement('div');
    wrap.innerHTML = BANNER_HTML;
    var floatEl = wrap.firstElementChild;
    document.body.appendChild(floatEl);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        floatEl.style.visibility = '';
      });
    });

    bindUi(floatEl);

    var settings = await fetchConsultSettings();
    applyQuickLinks(settings);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
