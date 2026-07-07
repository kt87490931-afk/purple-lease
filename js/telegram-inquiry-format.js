/**
 * 어드민 견적문의 4종 → 텔레그램 메시지 포맷 (HTML)
 */
'use strict';

var TABLE_LABELS = {
  inquiries: '일반문의',
  lease_quotes: '신차문의',
  used_car_inquiries: '중고차문의',
  lease_calculator_inquiries: '리스렌트계산기'
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmtWon(n) {
  var v = parseInt(n, 10);
  if (isNaN(v)) return esc(n || '-');
  return esc(v.toLocaleString('ko-KR') + '원');
}

function fmtPriceMan(n) {
  var v = parseInt(n, 10);
  if (isNaN(v) || v <= 0) return '-';
  if (v >= 10000) return Math.round(v / 10000).toLocaleString('ko-KR') + '만원';
  return v.toLocaleString('ko-KR') + '원';
}

function fmtKst(iso) {
  if (!iso) return '-';
  try {
    var d = new Date(iso);
    return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
  } catch (e) {
    return String(iso);
  }
}

function formatSourcePage(sp) {
  var s = String(sp || '').trim();
  if (!s) return '알 수 없음';
  if (s === 'index') return '메인페이지';
  if (s.indexOf('float-banner:') === 0) return '플로팅배너 (' + s.slice(13) + ')';
  if (s === 'estimate') return '신차 견적 페이지';
  if (s === 'used-car-detail') return '중고차 상세';
  if (s === 'lease-calculator') return '리스렌트 계산기';
  return s;
}

function line(label, value) {
  if (value == null || value === '') return '';
  return '<b>' + esc(label) + '</b>: ' + esc(value) + '\n';
}

function formatGeneralInquiry(record) {
  var brand = record.brand || record.car_type || '';
  var usage = record.usage_method || record.message || '';
  return (
    line('접수경로', formatSourcePage(record.source_page)) +
    line('브랜드', brand) +
    line('이용방식', usage) +
    line('성함', record.name) +
    line('연락처', record.phone)
  );
}

function formatLeaseQuote(record) {
  var q = record.quote_json || {};
  var cond = q.conditions || {};
  var labels = cond.labels || {};
  var originLabel = record.origin === 'import' || q.origin === 'import' ? '수입차' : '국산차';
  var opts = (q.options || []).map(function (o) {
    return (o.name || '') + (o.price ? ' (+' + Number(o.price).toLocaleString('ko-KR') + '원)' : '');
  }).filter(Boolean).join(', ') || '없음';

  return (
    line('접수경로', formatSourcePage(record.source_page || 'estimate')) +
    line('구분', originLabel) +
    line('브랜드', q.brand_name || record.brand_name) +
    line('차종', q.model_name || record.model_name) +
    line('외장색상', (q.color_name || '-') + (q.color_surcharge ? ' (+' + Number(q.color_surcharge).toLocaleString('ko-KR') + '원)' : '')) +
    line('트림', (q.trim_group ? q.trim_group + ' — ' : '') + (q.trim_name || '-')) +
    line('추가옵션', opts) +
    line('이용방법', labels.method || cond.method) +
    line('이용기간', labels.period || (cond.period ? cond.period + '개월' : '')) +
    line('보증금', labels.deposit || cond.deposit) +
    line('선납금', labels.prepay || cond.prepay) +
    line('보험연령', labels.insAge || cond.insAge) +
    line('자동차세', labels.carTax || cond.carTax) +
    line('연간주행', labels.mileage || cond.mileage) +
    line('신용도', labels.credit || cond.credit) +
    (q.pricing && q.pricing.total ? line('참고합계', q.pricing.total) : '') +
    line('성함', record.name) +
    line('연락처', record.phone)
  );
}

function formatUsedCarInquiry(record) {
  return (
    line('접수경로', formatSourcePage(record.source_page || 'used-car-detail')) +
    line('브랜드', record.brand) +
    line('차량명', record.vehicle_name) +
    line('상품제목', record.product_title) +
    line('차량가격', fmtPriceMan(record.price)) +
    line('상세링크', record.detail_url) +
    line('성함', record.name) +
    line('연락처', record.phone)
  );
}

function fmtCalcRate(calc) {
  var res = (calc && calc.results) || {};
  if (res.rate_percent != null) return res.rate_percent + '%';
  if (res.rate != null) return res.rate + '%';
  return '-';
}

function formatLeaseCalculatorInquiry(record) {
  var calc = record.calc_json || {};
  var inp = calc.inputs || {};
  var res = calc.results || {};
  var isMonthly = calc.calculator_type === 'monthly';
  var typeLabel = isMonthly ? '월납입금계산기' : '리스렌트금리계산기';
  var lines = line('접수경로', formatSourcePage(record.source_page || 'lease-calculator')) +
    line('계산기유형', typeLabel) +
    line('리스기간', inp.period ? inp.period + '개월' : '') +
    line('취득원가', inp.acquisition != null ? Number(inp.acquisition).toLocaleString('ko-KR') + '원' : '') +
    line('잔존가치', inp.residual != null ? Number(inp.residual).toLocaleString('ko-KR') + '원' : '') +
    line('선수금', inp.prepay != null ? Number(inp.prepay).toLocaleString('ko-KR') + '원' : '');

  if (isMonthly) {
    lines += line('이율(연)', '3% (고정)');
    if (res.calculated && res.monthly_payment != null) {
      lines += line('월납입금(계산)', Number(res.monthly_payment).toLocaleString('ko-KR') + '원');
    }
  } else {
    lines += line('월납입금(입력)', inp.monthly != null ? Number(inp.monthly).toLocaleString('ko-KR') + '원' : '');
    if (res.calculated) {
      lines += line('이율(계산)', fmtCalcRate(calc));
      if (res.total_cost != null) lines += line('총구매비용', Number(res.total_cost).toLocaleString('ko-KR') + '원');
      if (res.monthly_interest != null) lines += line('월이자비용', Number(res.monthly_interest).toLocaleString('ko-KR') + '원');
    } else {
      lines += line('계산결과', '미계산 (입력값만 접수)');
    }
  }

  lines += line('성함', record.name) + line('연락처', record.phone);
  return lines;
}

function formatInquiryTelegramMessage(table, record) {
  var label = TABLE_LABELS[table] || table;
  var body = '';
  if (table === 'inquiries') body = formatGeneralInquiry(record);
  else if (table === 'lease_quotes') body = formatLeaseQuote(record);
  else if (table === 'used_car_inquiries') body = formatUsedCarInquiry(record);
  else if (table === 'lease_calculator_inquiries') body = formatLeaseCalculatorInquiry(record);
  else body = JSON.stringify(record, null, 2);

  var text = '🔔 <b>[' + esc(label) + '] 새 견적문의</b>\n' +
    '━━━━━━━━━━━━━━\n' +
    body +
    line('접수시각', fmtKst(record.created_at)) +
    '\n<a href="https://purpleauto.co.kr/admin.html">어드민 견적문의 열기</a>';

  if (text.length > 4000) {
    text = text.slice(0, 3990) + '\n…(생략)';
  }
  return text;
}

module.exports = {
  TABLE_LABELS: TABLE_LABELS,
  formatInquiryTelegramMessage: formatInquiryTelegramMessage,
  formatSourcePage: formatSourcePage
};
