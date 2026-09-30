/**
 * 퍼플오토 고객후기 — Gemini API 생성
 */
'use strict';

var fs = require('fs');
var path = require('path');
var Topics = require('./review-topics');

var GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
var GEMINI_TEMPERATURE = parseFloat(process.env.GEMINI_TEMPERATURE || '0.92') || 0.92;
var GEMINI_TOP_P = parseFloat(process.env.GEMINI_TOP_P || '0.9') || 0.9;
var GEMINI_MAX_OUTPUT_TOKENS = parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || '8192', 10) || 8192;
// 2.5 계열은 구글이 용량을 제한 중(high demand 503 빈발) → 실패 시 3.x 안정판으로 대체. 'none' 이면 비활성
var GEMINI_FALLBACK_MODELS = String(process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.8-flash')
  .split(',').map(function (s) { return s.trim(); })
  .filter(function (s) { return s && s !== 'none' && s !== GEMINI_MODEL; });
var GEMINI_FALLBACK_MAX_OUTPUT_TOKENS = parseInt(process.env.GEMINI_FALLBACK_MAX_OUTPUT_TOKENS || '16384', 10) || 16384;
var GEMINI_ATTEMPTS_PER_MODEL = parseInt(process.env.GEMINI_ATTEMPTS_PER_MODEL || '2', 10) || 2;
var GEMINI_RETRY_WAIT_MS = parseInt(process.env.GEMINI_RETRY_WAIT_MS || '20000', 10) || 20000;
var GEMINI_REQUEST_TIMEOUT_MS = parseInt(process.env.GEMINI_REQUEST_TIMEOUT_MS || '100000', 10) || 100000;
var GEMINI_DEFAULT_BUDGET_MS = 6 * 60 * 1000;

var EMOJI_REGEX =
  /[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}\u{2705}\u{274C}\u{2728}\u{2764}\u{2763}\u{FE0F}]/gu;

function getApiKey() {
  var key = String(process.env.GEMINI_API_KEY || '').replace(/\ufeff/g, '').trim();
  if (key && key.length > 20) return key;
  var cwd = process.cwd();
  var candidates = [
    path.join(cwd, '.env.local'),
    path.join(cwd, '.env.sync'),
    path.join(cwd, '.env.production'),
    path.join(cwd, 'gemini_api_key.env')
  ];
  for (var i = 0; i < candidates.length; i++) {
    var p = candidates[i];
    if (!fs.existsSync(p)) continue;
    try {
      var content = fs.readFileSync(p, 'utf-8');
      if (p.endsWith('gemini_api_key.env')) {
        key = content.replace(/\ufeff/g, '').trim();
        if (key.length > 20) return key;
      } else {
        var m = content.match(/GEMINI_API_KEY\s*=\s*(.+)/);
        if (m) {
          key = m[1].trim().replace(/^["']|["']$/g, '').trim();
          if (key.length > 20) return key;
        }
      }
    } catch (e) { /* ignore */ }
  }
  return '';
}

function stripEmoji(text) {
  return String(text || '').replace(EMOJI_REGEX, '').trim();
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  var n = 0;
  var pos = String(haystack || '').indexOf(needle);
  while (pos >= 0) {
    n++;
    pos = haystack.indexOf(needle, pos + needle.length);
  }
  return n;
}

/**
 * @param {object} topic
 * @param {object} tone
 * @param {{mode?:string,keyword?:{keyword:string,car:string,intent:string}|null,subKeywords?:string[]}} [plan]
 */
function buildPrompt(topic, tone, plan) {
  var tonePrompt = Topics.TONE_PROMPTS[tone.id] || Topics.TONE_PROMPTS.honest_review;
  var catLabel = Topics.CATEGORY_LABELS[topic.category] || topic.category;
  var kw = plan && plan.keyword ? plan.keyword : null;
  var subs = (plan && plan.subKeywords) || [];

  var sellBlock = '';
  if (kw) {
    var carLabel = (Topics.CAR_TYPE_LABELS && Topics.CAR_TYPE_LABELS[kw.car]) || '';
    sellBlock =
      '[퍼플오토 실제 업무 — 이 범위 안에서만 작성]\n' +
      (Topics.SELL_BUSINESS_FACTS || []).map(function (f) { return '- ' + f + '\n'; }).join('') +
      (kw.intent === 'installment' ? '- 할부가 남은 차는 상황에 따라 할부 승계로 정리하는 방법도 안내한다\n' : '') +
      '- 위에 없는 수수료율·위약금 액수·금리·서류 이름 같은 구체 수치나 절차는 지어내지 말 것\n\n' +
      '[내 차량 계약 형태] ' + carLabel + ' (글 전체에서 이 계약 형태로 일관되게 작성)\n\n' +
      '[대표 키워드] ' + kw.keyword + '\n' +
      '- 제목에 대표 키워드를 띄어쓰기까지 그대로 1회 넣을 것\n' +
      '- 본문에 대표 키워드를 문장 속에 자연스럽게 2~3회 넣을 것 (억지 반복·나열 금지)\n' +
      (subs.length
        ? '[보조 키워드] ' + subs.join(', ') + '\n- 본문에 각각 1회 정도만 자연스럽게\n'
        : '') +
      '\n';
  }

  return (
    '너는 ' + Topics.BRAND_NAME + '를 이용한 실제 고객이다. 아래 [주제]에 맞는 이용 후기를 1인칭으로 작성해라.\n\n' +
    '[브랜드]\n' +
    '- 업체명: ' + Topics.BRAND_NAME + ' (타던 장기렌트카·리스차 매입·처분 전문 / 오토리스·장기렌트·중고차)\n' +
    '- 상담 전화: ' + Topics.BRAND_PHONE + ' (필요 시 1회만 자연스럽게 언급)\n' +
    '- 주소: 경기도 용인시 기흥구 (지역 언급은 선택)\n\n' +
    '[카테고리] ' + catLabel + '\n\n' +
    sellBlock +
    '[주제 — 본문 80% 이상 반드시 반영]\n' +
    topic.topic + '\n\n' +
    '[제목 참고 — 비슷한 느낌으로 새로 작성, 그대로 복사 금지]\n' +
    topic.titleSample + '\n\n' +
    '[톤]\n' + tonePrompt + '\n\n' +
    '[필수 규칙]\n' +
    '- 말투: 반드시 존댓말(~습니다, ~였습니다, ~해 주셨습니다, ~더라고요)로만 작성\n' +
    '- 반말·구어체 종결 금지: ~해, ~했어, ~더라, ~거든, ~임, ~야, ~지, ~네(반말), ~ㄹ게 등 사용하지 말 것\n' +
    '- 분량: ' + tone.charMin + '자 이상 ' + tone.charMax + '자 이하 (한글 기준, 공백 포함)\n' +
    '- 이모지 사용 금지\n' +
    '- 실제 이용 후기처럼 구체적으로 (상담 과정, 걸린 기간, 해결된 문제, 만족 포인트)\n' +
    '- 과장·허위 사실 금지. "최저가", "업계 1위" 등 검증 불가 표현 자제\n' +
    '- 리스승계·렌트승계(내 계약을 제3자·다음 차주에게 넘기거나, 남의 승계 매물을 이어받는 이야기)는 쓰지 말 것' +
    (kw && kw.intent === 'installment' ? ' (단, 할부 승계가 가능하다는 안내는 한 문장 이내로만 언급 가능)' : '') + '\n' +
    '- "룸빵여지도", "rbbmap" 등 타 사이트 언급 금지\n' +
    '- 업소·유흥 관련 내용 절대 금지\n' +
    '- 문단은 3~6개로 나누고, 모바일에서 읽기 편하게\n' +
    '- 마지막 문단에 한 줄 요약(예: "한 줄 평: ~") 포함\n\n' +
    '[출력 형식]\n' +
    '첫 줄: 제목 (한 줄)\n' +
    '둘째 줄: ---\n' +
    '셋째 줄부터: 본문\n' +
    '본문 마지막 두 줄:\n' +
    '핵심키워드: (2~4개, 쉼표 구분' + (kw ? ', 첫 번째는 반드시 "' + kw.keyword + '"' : '') + ')\n' +
    '고객유형: (개인/법인/소상공인/첫차량 중 하나)\n'
  );
}

function isGemini3Plus(model) {
  return /^gemini-([3-9]|\d{2,})/.test(String(model || ''));
}

function buildPayload(model, prompt, plain) {
  var generationConfig;
  if (isGemini3Plus(model)) {
    // 3.x: temperature/top_p 미사용 권장, 글쓰기는 thinking low
    generationConfig = { maxOutputTokens: GEMINI_FALLBACK_MAX_OUTPUT_TOKENS };
    if (!plain) generationConfig.thinkingConfig = { thinkingLevel: 'low' };
  } else {
    generationConfig = { temperature: GEMINI_TEMPERATURE, maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS, topP: GEMINI_TOP_P };
  }
  return {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: generationConfig,
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ]
  };
}

function extractText(json) {
  var parts = json && json.candidates && json.candidates[0] && json.candidates[0].content &&
    json.candidates[0].content.parts;
  if (!parts || !parts.length) return '';
  return parts.filter(function (p) { return p && typeof p.text === 'string' && !p.thought; })
    .map(function (p) { return p.text; }).join('');
}

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

/** Gemini 1회 호출 + 파싱·분량 검증. retryable=false 면 같은 모델 재시도 무의미 */
async function callGeminiOnce(model, apiKey, prompt, topic, tone, plan, timeoutMs, plain) {
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(apiKey);
  var start = Date.now();
  var limitMs = Math.max(10000, Math.min(timeoutMs || GEMINI_REQUEST_TIMEOUT_MS, GEMINI_REQUEST_TIMEOUT_MS));
  var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  var timer = controller ? setTimeout(function () { controller.abort(); }, limitMs) : null;
  try {
    var res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(buildPayload(model, prompt, plain)),
      signal: controller ? controller.signal : undefined
    });
    var json = null;
    try { json = await res.json(); } catch (e) { json = null; }
    var elapsedMs = Date.now() - start;

    if (!res.ok) {
      var errMsg = (json && json.error && json.error.message) ? json.error.message : ('HTTP ' + res.status);
      var retryable = res.status === 429 || res.status >= 500;
      return { success: false, retryable: retryable, httpStatus: res.status, message: 'Gemini API 오류: ' + errMsg };
    }

    var rawText = extractText(json);
    if (!rawText) {
      return { success: false, retryable: true, httpStatus: res.status, message: 'Gemini 응답 텍스트 없음' };
    }

    var text = stripEmoji(rawText.trim());
    var title = '';
    var body = text;
    var sep = text.indexOf('---');
    if (sep > 0) {
      title = text.slice(0, sep).trim().split('\n')[0] || '';
      body = text.slice(sep + 3).trim();
    }
    if (!title) title = topic.titleSample;
    title = title.replace(/^#+\s*/, '').replace(/^제목\s*[:：]\s*/, '').trim();

    var coreKeywords = [];
    var customerType = '';
    var lines = body.split(/\r?\n/);
    var bodyLines = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.indexOf('핵심키워드:') === 0) {
        coreKeywords = line.slice(6).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        continue;
      }
      if (line.indexOf('고객유형:') === 0) {
        customerType = line.slice(5).trim();
        continue;
      }
      bodyLines.push(lines[i]);
    }
    body = bodyLines.join('\n').trim();

    var charCount = body.length;
    var minLen = Math.max(1200, Math.floor(tone.charMin * 0.75));
    if (charCount < minLen) {
      return {
        success: false,
        retryable: true,
        httpStatus: res.status,
        message: '생성 본문이 ' + charCount + '자로 부족합니다 (최소 ' + tone.charMin + '자 목표).'
      };
    }
    if (charCount > 2500) {
      body = body.slice(0, tone.charMax + 100).trim();
      charCount = body.length;
    }

    var mainKeyword = plan && plan.keyword ? plan.keyword.keyword : '';
    if (mainKeyword) {
      coreKeywords = coreKeywords.filter(function (k) { return k !== mainKeyword; });
      coreKeywords.unshift(mainKeyword);
    }

    return {
      success: true,
      title: title.trim(),
      body: body,
      charCount: charCount,
      elapsedMs: elapsedMs,
      coreKeywords: coreKeywords,
      customerType: customerType,
      model: model,
      mainKeyword: mainKeyword,
      keywordInTitle: mainKeyword ? title.indexOf(mainKeyword) >= 0 : null,
      keywordCountInBody: mainKeyword ? countOccurrences(body, mainKeyword) : null
    };
  } catch (e) {
    var aborted = e && e.name === 'AbortError';
    return {
      success: false,
      retryable: true,
      httpStatus: 0,
      message: aborted ? 'Gemini 응답 시간 초과 (' + Math.round(limitMs / 1000) + '초)' : (e instanceof Error ? e.message : String(e))
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 기본 모델 → (과부하·오류 시 대기 후 재시도) → 예비 모델 순서로 시도
 * @param {object} topic
 * @param {object} tone
 * @param {object} [plan] pickReviewPlan 결과 (keyword, subKeywords)
 * @param {{maxTotalMs?:number}} [opts] 전체 시간 예산 (어드민 즉시 생성은 Cloudflare 100초 제한 고려)
 * @returns {Promise<{success:true,title:string,body:string,charCount:number,elapsedMs:number,coreKeywords:string[],customerType:string,model:string,attempts:Array}|{success:false,message:string,attempts:Array}>}
 */
async function generateCustomerReview(topic, tone, plan, opts) {
  var apiKey = getApiKey();
  if (!apiKey) return { success: false, message: 'GEMINI_API_KEY가 설정되지 않았습니다.', attempts: [] };

  opts = opts || {};
  var budgetMs = opts.maxTotalMs || GEMINI_DEFAULT_BUDGET_MS;
  var startAll = Date.now();
  var prompt = buildPrompt(topic, tone, plan);
  var models = [GEMINI_MODEL].concat(GEMINI_FALLBACK_MODELS);
  var attempts = [];
  var last = null;

  for (var m = 0; m < models.length; m++) {
    var model = models[m];
    var plain = false;
    for (var a = 1; a <= GEMINI_ATTEMPTS_PER_MODEL; a++) {
      var remaining = budgetMs - (Date.now() - startAll);
      if (remaining < 15000) break;
      last = await callGeminiOnce(model, apiKey, prompt, topic, tone, plan, remaining, plain);
      attempts.push({
        model: model,
        attempt: a,
        plain: plain,
        ok: !!last.success,
        http_status: last.httpStatus || (last.success ? 200 : 0),
        msg: last.success ? '' : String(last.message || '').slice(0, 160)
      });
      if (last.success) {
        last.attempts = attempts;
        last.elapsedMs = Date.now() - startAll;
        return last;
      }
      if (last.httpStatus === 400 && isGemini3Plus(model) && !plain) {
        // thinkingConfig 미지원 등 요청 형식 문제 → 기본 설정으로 1회 더
        plain = true;
        a--;
        continue;
      }
      if (!last.retryable) break;
      if (a < GEMINI_ATTEMPTS_PER_MODEL) {
        var wait = Math.min(GEMINI_RETRY_WAIT_MS * a, budgetMs - (Date.now() - startAll) - 45000);
        if (wait <= 0) break;
        await sleep(wait);
      }
    }
  }

  var summary = attempts.map(function (x) { return x.model + '#' + x.attempt + ' ' + (x.http_status || '') ; }).join(', ');
  return {
    success: false,
    message: ((last && last.message) || 'Gemini 생성 실패') + (attempts.length > 1 ? ' [시도: ' + summary + ']' : ''),
    attempts: attempts
  };
}

module.exports = {
  generateCustomerReview: generateCustomerReview,
  buildPrompt: buildPrompt,
  getApiKey: getApiKey,
  GEMINI_MODEL: GEMINI_MODEL,
  GEMINI_FALLBACK_MODELS: GEMINI_FALLBACK_MODELS
};
