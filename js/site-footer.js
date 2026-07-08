/**
 * 푸터 법적 링크 · 고지문 · 모달 — Supabase footer_settings 연동
 */
(function () {
  'use strict';

  var DEFAULT_DISCLAIMER =
    '금융상품 상담은 등록된 금융상품판매대리 · 중개업자가 진행합니다. ' +
    '금융상품판매대리 · 중개업자 성명 및 등록번호 소속 법인(또는 제휴 법인) ' +
    '계약 체결 권한은 금융회사에 있으며, 당사는 금융상품판매대리 · 중개업자로서 모집 업무';

  var FALLBACK = {
    terms_of_service: '',
    privacy_policy: '',
    disclaimer_text: DEFAULT_DISCLAIMER,
    certificate_url: '',
    certificate_mime: ''
  };

  var cachedSettings = null;
  var modalEl = null;

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeDisclaimer(text) {
    var s = String(text || DEFAULT_DISCLAIMER).replace(/\s+/g, ' ').trim();
    return s || DEFAULT_DISCLAIMER;
  }

  function mergeSettings(row) {
    var merged = Object.assign({}, FALLBACK, row || {});
    merged.disclaimer_text = normalizeDisclaimer(merged.disclaimer_text);
    return merged;
  }

  async function fetchSettings() {
    if (cachedSettings) return cachedSettings;
    var cfg = window.SUPABASE_CONFIG;
    if (!cfg || !cfg.url || !cfg.anonKey) {
      cachedSettings = mergeSettings(null);
      return cachedSettings;
    }
    try {
      var url = cfg.url.replace(/\/$/, '') + '/rest/v1/footer_settings?id=eq.1&select=*';
      var res = await fetch(url, {
        headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey }
      });
      if (!res.ok) {
        cachedSettings = mergeSettings(null);
        return cachedSettings;
      }
      var rows = await res.json();
      cachedSettings = mergeSettings(rows && rows[0] ? rows[0] : null);
      return cachedSettings;
    } catch (e) {
      console.warn('[site-footer]', e);
      cachedSettings = mergeSettings(null);
      return cachedSettings;
    }
  }

  function unwrapLegacyFooterLayout(wrap, meta) {
    var bottom = wrap.querySelector('.footer-bottom');
    if (bottom) {
      if (meta.parentNode === bottom) {
        bottom.parentNode.insertBefore(meta, bottom);
      }
      bottom.remove();
    }
    wrap.querySelectorAll('.footer-disclaimer').forEach(function (el) {
      if (el.parentNode !== meta) el.remove();
    });
  }

  function ensureFooterStructure(footer) {
    var wrap = footer.querySelector('.wrap');
    if (!wrap) return null;
    var links = wrap.querySelector('.footer-links');
    var meta = wrap.querySelector('.footer-meta');
    if (!links || !meta) return null;

    unwrapLegacyFooterLayout(wrap, meta);

    var legal = wrap.querySelector('.footer-legal');
    if (!legal) {
      legal = document.createElement('div');
      legal.className = 'footer-legal';
      legal.setAttribute('role', 'navigation');
      legal.setAttribute('aria-label', '법적 고지');
      links.insertAdjacentElement('afterend', legal);
    }

    var disclaimer = meta.querySelector('.footer-disclaimer');
    if (!disclaimer) {
      disclaimer = document.createElement('div');
      disclaimer.className = 'footer-disclaimer';
      meta.appendChild(disclaimer);
    }

    return {
      legal: legal,
      disclaimer: disclaimer,
      meta: meta
    };
  }

  function ensureModal() {
    if (modalEl) return modalEl;
    modalEl = document.createElement('div');
    modalEl.id = 'footerLegalModal';
    modalEl.className = 'footer-modal';
    modalEl.hidden = true;
    modalEl.innerHTML =
      '<div class="footer-modal-backdrop" data-footer-modal-close></div>' +
      '<div class="footer-modal-box" role="dialog" aria-modal="true" aria-labelledby="footerModalTitle">' +
        '<div class="footer-modal-head">' +
          '<h2 id="footerModalTitle"></h2>' +
          '<button type="button" class="footer-modal-close" data-footer-modal-close aria-label="닫기">&times;</button>' +
        '</div>' +
        '<div class="footer-modal-body" id="footerModalBody"></div>' +
      '</div>';
    document.body.appendChild(modalEl);

    modalEl.querySelectorAll('[data-footer-modal-close]').forEach(function (el) {
      el.addEventListener('click', closeModal);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalEl && !modalEl.hidden) closeModal();
    });
    return modalEl;
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.hidden = true;
    document.body.style.overflow = '';
  }

  function isPdf(settings) {
    var mime = String(settings.certificate_mime || '').toLowerCase();
    var url = String(settings.certificate_url || '').toLowerCase();
    return mime === 'application/pdf' || /\.pdf(\?|$)/.test(url);
  }

  function openModal(kind, settings) {
    var modal = ensureModal();
    var titleEl = modal.querySelector('#footerModalTitle');
    var bodyEl = modal.querySelector('#footerModalBody');
    var title = '';
    var html = '';

    if (kind === 'terms') {
      title = '이용약관';
      var terms = String(settings.terms_of_service || '').trim();
      html = terms
        ? esc(terms)
        : '<p class="footer-modal-empty">이용약관 내용이 등록되지 않았습니다.</p>';
    } else if (kind === 'privacy') {
      title = '개인정보처리방침';
      var privacy = String(settings.privacy_policy || '').trim();
      html = privacy
        ? esc(privacy)
        : '<p class="footer-modal-empty">개인정보처리방침 내용이 등록되지 않았습니다.</p>';
    } else if (kind === 'certificate') {
      title = '금융상품판매대리 · 중개업자 등록증';
      var certUrl = String(settings.certificate_url || '').trim();
      if (!certUrl) {
        html = '<p class="footer-modal-empty">등록증 파일이 등록되지 않았습니다.</p>';
      } else if (isPdf(settings)) {
        html = '<iframe src="' + esc(certUrl) + '" title="금융상품판매대리 · 중개업자 등록증"></iframe>';
      } else {
        html = '<img src="' + esc(certUrl) + '" alt="금융상품판매대리 · 중개업자 등록증">';
      }
    }

    titleEl.textContent = title;
    bodyEl.innerHTML = html;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modal.querySelector('.footer-modal-close').focus();
  }

  function renderLegalLinks(legal, settings) {
    legal.innerHTML =
      '<button type="button" class="footer-legal-link" data-footer-modal="terms">이용약관</button>' +
      '<span class="footer-legal-sep" aria-hidden="true">/</span>' +
      '<button type="button" class="footer-legal-link" data-footer-modal="privacy">개인정보처리방침</button>' +
      '<span class="footer-legal-sep" aria-hidden="true">/</span>' +
      '<button type="button" class="footer-legal-link" data-footer-modal="certificate">금융상품판매대리 · 중개업자 등록증</button>';

    legal.querySelectorAll('[data-footer-modal]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openModal(btn.getAttribute('data-footer-modal'), settings);
      });
    });
  }

  function renderDisclaimer(disclaimer, settings) {
    if (!disclaimer) return;
    disclaimer.textContent = normalizeDisclaimer(settings.disclaimer_text);
  }

  async function bootstrap() {
    var footer = document.querySelector('.site-footer');
    if (!footer) return;
    var parts = ensureFooterStructure(footer);
    if (!parts) return;

    var settings = await fetchSettings();
    renderLegalLinks(parts.legal, settings);
    renderDisclaimer(parts.disclaimer, settings);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
