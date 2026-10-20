/**
 * OpenAI Ads Measurement Pixel
 * Pixel ID: KVwjubfqowxNYJRgkGMSKQ
 * 관리자 표시명: 리스렌트_매입상담_접수완료 → 코드 이벤트: lead_created
 *
 * 측정 동의 UI가 사이트에 없으므로 consent를 임의로 바꾸지 않습니다.
 * (상담 개인정보 동의 체크를 광고 측정 동의로 간주하지 않음)
 */
(function (w, d, s, u) {
  'use strict';

  if (!w.oaiq) {
    var q = function () {
      q.q.push(arguments);
    };
    q.q = [];
    w.oaiq = q;

    var js = d.createElement(s);
    js.async = true;
    js.src = u;
    var first = d.getElementsByTagName(s)[0];
    if (first && first.parentNode) {
      first.parentNode.insertBefore(js, first);
    } else {
      (d.head || d.documentElement).appendChild(js);
    }
  }

  w.oaiq('init', {
    pixelId: 'KVwjubfqowxNYJRgkGMSKQ'
  });

  /**
   * 상담 DB 저장 성공 직후에만 호출.
   * inquiryId: DB 접수 id (없으면 호출하지 않음)
   */
  w.trackPurpleAutoLead = function (inquiryId) {
    if (inquiryId == null || inquiryId === '') return;
    if (typeof w.oaiq !== 'function') return;

    var eventId = 'purpleauto_lead_' + String(inquiryId);
    var storageKey = 'openai_lead_queued:' + eventId;

    w.__purpleLeadQueued = w.__purpleLeadQueued || new Set();
    if (w.__purpleLeadQueued.has(eventId)) return;

    try {
      if (w.sessionStorage && w.sessionStorage.getItem(storageKey)) return;
    } catch (_) { /* sessionStorage 불가 시 메모리 Set만 사용 */ }

    try {
      w.oaiq(
        'measure',
        'lead_created',
        { type: 'customer_action' },
        { event_id: eventId }
      );
      w.__purpleLeadQueued.add(eventId);
      try {
        if (w.sessionStorage) w.sessionStorage.setItem(storageKey, '1');
      } catch (_) { /* ignore */ }
    } catch (error) {
      console.warn('[OpenAI Ads] 이벤트 호출 실패', error);
    }
  };
})(window, document, 'script', 'https://bzrcdn.openai.com/sdk/oaiq.min.js');
