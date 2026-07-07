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

function buildPrompt(topic, tone) {
  var tonePrompt = Topics.TONE_PROMPTS[tone.id] || Topics.TONE_PROMPTS.honest_review;
  var catLabel = Topics.CATEGORY_LABELS[topic.category] || topic.category;
  return (
    '너는 ' + Topics.BRAND_NAME + '를 이용한 실제 고객이다. 아래 [주제]에 맞는 이용 후기를 1인칭으로 작성해라.\n\n' +
    '[브랜드]\n' +
    '- 업체명: ' + Topics.BRAND_NAME + ' (오토리스·장기렌트·리스승계·중고차 전문)\n' +
    '- 상담 전화: ' + Topics.BRAND_PHONE + ' (필요 시 1회만 자연스럽게 언급)\n' +
    '- 주소: 경기도 용인시 기흥구 (지역 언급은 선택)\n\n' +
    '[카테고리] ' + catLabel + '\n\n' +
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
    '- "룸빵여지도", "rbbmap" 등 타 사이트 언급 금지\n' +
    '- 업소·유흥 관련 내용 절대 금지\n' +
    '- 문단은 3~6개로 나누고, 모바일에서 읽기 편하게\n' +
    '- 마지막 문단에 한 줄 요약(예: "한 줄 평: ~") 포함\n\n' +
    '[출력 형식]\n' +
    '첫 줄: 제목 (한 줄)\n' +
    '둘째 줄: ---\n' +
    '셋째 줄부터: 본문\n' +
    '본문 마지막 두 줄:\n' +
    '핵심키워드: (2~4개, 쉼표 구분)\n' +
    '고객유형: (개인/법인/소상공인/첫차량 중 하나)\n'
  );
}

/**
 * @returns {Promise<{success:true,title:string,body:string,charCount:number,elapsedMs:number,coreKeywords:string[],customerType:string}|{success:false,message:string}>}
 */
async function generateCustomerReview(topic, tone) {
  var apiKey = getApiKey();
  if (!apiKey) return { success: false, message: 'GEMINI_API_KEY가 설정되지 않았습니다.' };

  var prompt = buildPrompt(topic, tone);
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + encodeURIComponent(apiKey);
  var payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: GEMINI_TEMPERATURE,
      maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
      topP: GEMINI_TOP_P
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ]
  };

  var start = Date.now();
  try {
    var res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(payload)
    });
    var json = await res.json();
    var elapsedMs = Date.now() - start;

    if (!res.ok) {
      var errMsg = (json && json.error && json.error.message) ? json.error.message : ('HTTP ' + res.status);
      return { success: false, message: 'Gemini API 오류: ' + errMsg };
    }

    var rawText = json && json.candidates && json.candidates[0] && json.candidates[0].content &&
      json.candidates[0].content.parts && json.candidates[0].content.parts[0] &&
      json.candidates[0].content.parts[0].text;
    if (!rawText || typeof rawText !== 'string') {
      return { success: false, message: 'Gemini 응답 텍스트 없음' };
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
        message: '생성 본문이 ' + charCount + '자로 부족합니다 (최소 ' + tone.charMin + '자 목표).'
      };
    }
    if (charCount > 2500) {
      body = body.slice(0, tone.charMax + 100).trim();
      charCount = body.length;
    }

    return {
      success: true,
      title: title.trim(),
      body: body,
      charCount: charCount,
      elapsedMs: elapsedMs,
      coreKeywords: coreKeywords,
      customerType: customerType
    };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : String(e) };
  }
}

module.exports = {
  generateCustomerReview: generateCustomerReview,
  getApiKey: getApiKey,
  GEMINI_MODEL: GEMINI_MODEL
};
