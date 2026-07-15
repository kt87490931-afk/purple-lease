/**
 * Supabase 견적문의 4종 조회 → 텔레그램 /리스트 메시지
 */
'use strict';

var Formatter = require('./telegram-inquiry-format.js');

var TABLE_META = {
  inquiries: { label: '일반문의', emoji: '📩' },
  lease_quotes: { label: '신차문의', emoji: '🚗' },
  used_car_inquiries: { label: '중고차문의', emoji: '🔄' },
  lease_calculator_inquiries: { label: '리스렌트계산기', emoji: '🧮' }
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmtKstShort(iso) {
  if (!iso) return '-';
  try {
    var d = new Date(iso);
    return d.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (e) {
    return String(iso).slice(0, 16);
  }
}

function sbConfig() {
  var url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return { url: url, key: key };
}

async function sbGet(table, query) {
  var cfg = sbConfig();
  if (!cfg.url || !cfg.key) throw new Error('Supabase 서버 설정 누락');
  var qs = query || 'select=*&order=created_at.desc&limit=5';
  var res = await fetch(cfg.url + '/rest/v1/' + table + '?' + qs, {
    headers: {
      apikey: cfg.key,
      Authorization: 'Bearer ' + cfg.key,
      Accept: 'application/json'
    }
  });
  if (!res.ok) {
    var errText = await res.text().catch(function () { return ''; });
    throw new Error(table + ' 조회 실패 (' + res.status + ') ' + errText.slice(0, 120));
  }
  return res.json();
}

async function sbCountUnread(table) {
  var cfg = sbConfig();
  if (!cfg.url || !cfg.key) return 0;
  var res = await fetch(
    cfg.url + '/rest/v1/' + table + '?select=id&is_read=eq.false',
    {
      headers: {
        apikey: cfg.key,
        Authorization: 'Bearer ' + cfg.key,
        Prefer: 'count=exact',
        Range: '0-0'
      }
    }
  );
  if (!res.ok) return 0;
  var range = res.headers.get('content-range') || '';
  var m = range.match(/\/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

function summarizeGeneral(row) {
  var ct = String(row.consult_type || '').trim();
  var consultLabel = '리스·렌트';
  if (ct === 'paid_transfer') consultLabel = '완납승계';
  else if (ct === 'used_car') consultLabel = '중고차';
  return [
    esc(consultLabel),
    esc(row.brand || row.car_type || '-'),
    esc(row.usage_method || row.message || '-'),
    esc(Formatter.formatSourcePage(row.source_page))
  ].join(' · ');
}

function summarizeLeaseQuote(row) {
  var q = row.quote_json || {};
  return esc((q.brand_name || row.brand_name || '-') + ' ' + (q.model_name || row.model_name || ''));
}

function summarizeUsedCar(row) {
  return esc((row.brand || '') + ' ' + (row.product_title || row.vehicle_name || '-'));
}

function summarizeLeaseCalc(row) {
  var calc = row.calc_json || {};
  var inp = calc.inputs || {};
  var res = calc.results || {};
  var parts = [];
  if (inp.period) parts.push(inp.period + '개월');
  if (res.monthly_payment != null) parts.push('월 ' + Number(res.monthly_payment).toLocaleString('ko-KR') + '원');
  else if (inp.monthly != null) parts.push('월 ' + Number(inp.monthly).toLocaleString('ko-KR') + '원');
  if (res.rate_percent != null) parts.push('이율 ' + res.rate_percent + '%');
  return esc(parts.join(' · ') || '계산기 문의');
}

function rowToItem(table, row) {
  var meta = TABLE_META[table] || { label: table, emoji: '•' };
  var summary = '';
  if (table === 'inquiries') summary = summarizeGeneral(row);
  else if (table === 'lease_quotes') summary = summarizeLeaseQuote(row);
  else if (table === 'used_car_inquiries') summary = summarizeUsedCar(row);
  else if (table === 'lease_calculator_inquiries') summary = summarizeLeaseCalc(row);

  return {
    table: table,
    id: row.id,
    label: meta.label,
    emoji: meta.emoji,
    name: row.name || '',
    phone: row.phone || '',
    summary: summary,
    isRead: !!row.is_read,
    createdAt: row.created_at
  };
}

async function fetchRecentInquiries(limitPerTable) {
  var limit = limitPerTable || 5;
  var tables = Object.keys(TABLE_META);
  var results = await Promise.all(tables.map(function (table) {
    return sbGet(table, 'select=*&order=created_at.desc&limit=' + limit).then(function (rows) {
      return (rows || []).map(function (row) { return rowToItem(table, row); });
    });
  }));
  var merged = [];
  results.forEach(function (arr) { merged = merged.concat(arr); });
  merged.sort(function (a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return merged.slice(0, limit * 2);
}

async function fetchUnreadCounts() {
  var tables = Object.keys(TABLE_META);
  var counts = {};
  await Promise.all(tables.map(async function (table) {
    counts[table] = await sbCountUnread(table);
  }));
  return counts;
}

function formatListMessage(items, unread) {
  unread = unread || {};
  var uGeneral = unread.inquiries || 0;
  var uNew = unread.lease_quotes || 0;
  var uUsed = unread.used_car_inquiries || 0;
  var uCalc = unread.lease_calculator_inquiries || 0;
  var totalUnread = uGeneral + uNew + uUsed + uCalc;

  var lines = [
    '📋 <b>견적문의 리스트</b>',
    '━━━━━━━━━━━━━━',
    '<b>미확인</b> ' + totalUnread + '건',
    '일반 ' + uGeneral + ' · 신차 ' + uNew + ' · 중고 ' + uUsed + ' · 계산기 ' + uCalc,
    ''
  ];

  if (!items || !items.length) {
    lines.push('접수된 견적문의가 없습니다.');
  } else {
    items.forEach(function (item, idx) {
      var unreadMark = item.isRead ? '' : ' 🔴';
      lines.push(
        item.emoji + ' <b>[' + esc(item.label) + ']</b>' + unreadMark + ' ' + esc(fmtKstShort(item.createdAt))
      );
      lines.push('👤 ' + esc(item.name) + ' · ' + esc(item.phone));
      if (item.summary) lines.push('📝 ' + item.summary);
      if (idx < items.length - 1) lines.push('');
    });
  }

  lines.push('');
  lines.push('<a href="https://purpleauto.co.kr/admin.html">어드민에서 상세보기</a>');
  lines.push('');
  lines.push('명령: /테스트 · /리스트');

  var text = lines.join('\n');
  if (text.length > 4000) text = text.slice(0, 3990) + '\n…(생략)';
  return text;
}

async function buildListMessage() {
  var unread = await fetchUnreadCounts();
  var items = await fetchRecentInquiries(5);
  return formatListMessage(items, unread);
}

function formatTestMessage(opts) {
  opts = opts || {};
  var now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
  return [
    '✅ <b>봇 연결 테스트 OK</b>',
    '━━━━━━━━━━━━━━',
    '🤖 @Purpleauto_bot 정상 동작 중',
    '🕐 ' + esc(now),
    '📡 알림 서버: inquiry-telegram-webhook',
    '🔑 Bot Token: ' + (opts.hasBot ? '설정됨' : '미설정'),
    '💬 Chat ID: ' + (opts.hasChat ? esc(String(opts.chatId || '')) : '미설정'),
    '🗄 Supabase: ' + (opts.hasSupabase ? '연결됨' : '미설정'),
    '',
    '명령어',
    '· /테스트 — 봇 상태 확인',
    '· /리스트 — 최근 견적문의 목록',
    '',
    '<a href="https://purpleauto.co.kr/admin.html">어드민 견적문의</a>'
  ].join('\n');
}

module.exports = {
  TABLE_META: TABLE_META,
  fetchRecentInquiries: fetchRecentInquiries,
  fetchUnreadCounts: fetchUnreadCounts,
  formatListMessage: formatListMessage,
  buildListMessage: buildListMessage,
  formatTestMessage: formatTestMessage
};
