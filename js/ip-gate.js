/**
 * 접속 차단(block_mode=site)된 IP는 공개 페이지를 열지 않습니다.
 * 판정은 visitor_block_status()가 요청 IP로 하고, 실패하면 사이트를 그대로 둡니다.
 * 어드민 페이지에는 넣지 않습니다. 관리자 IP를 막아도 해제 화면은 열립니다.
 */
(function () {
  'use strict';

  if (/^\/admin/i.test(window.location.pathname || '')) return;

  var cfg = window.SUPABASE_CONFIG;
  if (!cfg || !cfg.url || !cfg.anonKey || typeof fetch !== 'function') return;

  var url = cfg.url.replace(/\/$/, '') + '/rest/v1/rpc/visitor_block_status';
  fetch(url, {
    method: 'POST',
    headers: {
      apikey: cfg.anonKey,
      Authorization: 'Bearer ' + cfg.anonKey,
      'Content-Type': 'application/json'
    },
    body: '{}'
  }).then(function (res) {
    if (!res.ok) return null;
    return res.json();
  }).then(function (status) {
    if (status === 'inquiry' || status === 'site') {
      window.__paInquiryBlocked = true;
    }
    if (status !== 'site') return;
    document.documentElement.innerHTML =
      '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>접속 제한</title></head>' +
      '<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#11143A;color:#fff;font-family:sans-serif;">' +
      '<p style="font-size:18px;">접속이 제한되었습니다.</p></body>';
  }).catch(function () { /* 확인 실패 시 사이트는 그대로 */ });
})();
