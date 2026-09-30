/**
 * 퍼플오토 고객후기 AI 생성 — Supabase 연동 오케스트레이션
 */
'use strict';

var Topics = require('./review-topics');
var Gemini = require('./gemini-customer-review');

var SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
var SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

function nowIso() {
  return new Date().toISOString();
}

function kstDateString(d) {
  return (d || new Date()).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}

async function sbFetch(tablePath, options) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required');
  var url = SUPABASE_URL + '/rest/v1/' + tablePath;
  var headers = Object.assign({
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json'
  }, (options && options.headers) || {});
  var res = await fetch(url, Object.assign({}, options, { headers: headers }));
  var text = await res.text();
  if (!res.ok) throw new Error('Supabase ' + res.status + ': ' + text.slice(0, 400));
  if (res.status === 204 || !text || !String(text).trim()) return null;
  return JSON.parse(text);
}

async function getRecentTopicIds(limit) {
  var rows = await sbFetch(
    'customer_reviews?select=topic_id&topic_id=not.is.null&order=created_at.desc&limit=' + (limit || 15),
    { method: 'GET' }
  );
  return (rows || []).map(function (r) { return r.topic_id; }).filter(function (id) { return typeof id === 'number'; });
}

async function getRecentToneIds(limit) {
  var rows = await sbFetch(
    'customer_reviews?select=generation_meta&is_ai_generated=eq.true&order=created_at.desc&limit=' + (limit || 10),
    { method: 'GET' }
  );
  return (rows || []).map(function (r) {
    return r.generation_meta && r.generation_meta.tone_id;
  }).filter(Boolean);
}

/** 최근 AI 후기의 category·main_keyword (8:2 비중·키워드 순환용, 최신순) */
async function getRecentAiMeta(limit) {
  var rows = await sbFetch(
    'customer_reviews?select=category,topic_id,generation_meta&is_ai_generated=eq.true&order=created_at.desc&limit=' + (limit || 30),
    { method: 'GET' }
  );
  rows = rows || [];
  return {
    categories: rows.map(function (r) { return r.category || ''; }),
    keywords: rows.map(function (r) {
      return (r.generation_meta && r.generation_meta.main_keyword) || '';
    }).filter(Boolean)
  };
}

function getSellRatio() {
  var v = parseFloat(process.env.REVIEW_SELL_RATIO || '0.8');
  return isNaN(v) ? 0.8 : Math.min(1, Math.max(0, v));
}

/**
 * 키워드 개편 후 DB가 쌓일 때까지 한시 증량. 종료일(KST) 다음 날부터 자동으로 평소 값 복귀.
 * env 로 조정 가능: REVIEW_BOOST_UNTIL=YYYY-MM-DD (빈 값·none 이면 비활성)
 */
var REVIEW_BOOST_UNTIL_DEFAULT = '2026-10-28';

function getBoostUntil() {
  var v = process.env.REVIEW_BOOST_UNTIL;
  if (v === undefined) v = REVIEW_BOOST_UNTIL_DEFAULT;
  v = String(v || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
}

function isBoostActive() {
  var until = getBoostUntil();
  return !!until && kstDateString() <= until;
}

function getDailyMax() {
  var base = parseInt(process.env.REVIEW_DAILY_MAX || '2', 10) || 2;
  if (isBoostActive()) {
    var boost = parseInt(process.env.REVIEW_BOOST_DAILY_MAX || '4', 10) || 4;
    return Math.max(base, boost);
  }
  return base;
}

function getAutoIntervalMs() {
  var hours = parseInt(process.env.REVIEW_AUTO_INTERVAL_HOURS || '12', 10) || 12;
  if (isBoostActive()) {
    var boostHours = parseInt(process.env.REVIEW_BOOST_INTERVAL_HOURS || '4', 10) || 4;
    hours = Math.min(hours, boostHours);
  }
  return hours * 60 * 60 * 1000;
}

/** cron 정각 실행 vs 직전 생성 완료 시각 차이(수십 초)로 간격 판정이 빗나가지 않도록 */
var AUTO_INTERVAL_GRACE_MS = 15 * 60 * 1000;

async function getTodayAiCount() {
  var today = kstDateString();
  var rows = await sbFetch(
    'customer_reviews?select=id&is_ai_generated=eq.true&published_at=eq.' + today,
    { method: 'GET' }
  );
  return (rows || []).length;
}

async function getLastAiPublishedAt() {
  var rows = await sbFetch(
    'customer_reviews?select=created_at&is_ai_generated=eq.true&order=created_at.desc&limit=1',
    { method: 'GET' }
  );
  return rows && rows[0] ? rows[0].created_at : null;
}

async function assertCanPublish(skipDailyLimit) {
  if (skipDailyLimit) return;
  var dailyMax = getDailyMax();
  var todayCount = await getTodayAiCount();
  if (todayCount >= dailyMax) {
    throw new Error('일일 AI 후기 생성 한도(' + dailyMax + '건)에 도달했습니다.');
  }
}

async function canAutoPublish() {
  var dailyMax = getDailyMax();
  var todayCount = await getTodayAiCount();
  if (todayCount >= dailyMax) {
    return { ok: false, reason: 'daily_limit', todayCount: todayCount, dailyMax: dailyMax };
  }
  var last = await getLastAiPublishedAt();
  if (last) {
    var intervalMs = getAutoIntervalMs();
    var elapsed = Date.now() - new Date(last).getTime();
    if (elapsed < intervalMs - AUTO_INTERVAL_GRACE_MS) {
      return {
        ok: false,
        reason: 'interval',
        todayCount: todayCount,
        dailyMax: dailyMax,
        waitMinutes: Math.ceil((intervalMs - AUTO_INTERVAL_GRACE_MS - elapsed) / 60000)
      };
    }
  }
  return { ok: true, todayCount: todayCount, dailyMax: dailyMax, boost: isBoostActive() };
}

async function runAutoPublish() {
  var gate = await canAutoPublish();
  if (!gate.ok) {
    return {
      ok: false,
      msg: gate.reason === 'daily_limit'
        ? '일일 한도 도달 (' + gate.todayCount + '/' + gate.dailyMax + ')'
        : '생성 간격 대기 중 (약 ' + gate.waitMinutes + '분 후)',
      gate: gate
    };
  }
  return runOneGeneration({
    publish: true,
    dryRun: false,
    source: 'cron',
    skipDailyLimit: false
  });
}

async function getNextListingId() {
  var rows = await sbFetch('customer_reviews?select=listing_id&order=listing_id.desc&limit=1', { method: 'GET' });
  return (rows && rows[0]) ? rows[0].listing_id + 1 : 1;
}

async function writeGenLog(row) {
  try {
    var res = await sbFetch('customer_review_gen_logs', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify([row])
    });
    return res && res[0] ? res[0].id : null;
  } catch (e) {
    console.error('[review-gen] log write failed:', e.message || e);
    return null;
  }
}

async function updateQueueItem(queueId, patch) {
  await sbFetch('customer_review_gen_queue?id=eq.' + queueId, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(patch)
  });
}

/**
 * @param {object} opts
 * @param {number|null} opts.topicId
 * @param {string|null} opts.toneId
 * @param {boolean} opts.publish
 * @param {boolean} opts.dryRun
 * @param {number|null} opts.queueId
 * @param {string} opts.source manual|queue|cron
 */
async function runOneGeneration(opts) {
  opts = opts || {};
  var startedAt = nowIso();
  var startMs = Date.now();
  var source = opts.source || 'manual';
  var publish = opts.publish !== false;
  var dryRun = !!opts.dryRun;

  var diag = { source: source, dry_run: dryRun, publish: publish };

  try {
    if (!Gemini.getApiKey()) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    var recentTopics = await getRecentTopicIds(15);
    var recentTones = await getRecentToneIds(8);
    var recentMeta = await getRecentAiMeta(30);
    var plan = Topics.pickReviewPlan({
      recentTopicIds: recentTopics,
      recentCategories: recentMeta.categories,
      recentKeywords: recentMeta.keywords,
      seed: Date.now(),
      forcedTopicId: opts.topicId || null,
      sellRatio: getSellRatio()
    });
    var topic = plan && plan.topic;
    if (!topic) throw new Error('주제를 찾을 수 없습니다.');
    var mainKeyword = plan.keyword ? plan.keyword.keyword : '';

    var tone = null;
    if (opts.toneId) {
      tone = Topics.REVIEW_TONES.find(function (t) { return t.id === opts.toneId; }) || null;
    }
    if (!tone) tone = Topics.pickTone(recentTones, Date.now());

    diag.topic_id = topic.id;
    diag.topic_category = topic.category;
    diag.tone_id = tone.id;
    diag.review_mode = plan.mode;
    diag.main_keyword = mainKeyword;
    diag.sub_keywords = plan.subKeywords || [];
    diag.boost_active = isBoostActive();

    // 어드민 즉시 생성은 Cloudflare 100초 제한 → 85초 예산
    var gen = await Gemini.generateCustomerReview(topic, tone, plan, {
      maxTotalMs: source === 'admin' ? 85000 : undefined
    });
    diag.gemini_attempts = gen.attempts || [];
    if (!gen.success) throw new Error(gen.message);

    diag.char_count = gen.charCount;
    diag.elapsed_ms = gen.elapsedMs;
    diag.sample_title = gen.title;
    diag.model = gen.model || Gemini.GEMINI_MODEL;
    diag.keyword_in_title = gen.keywordInTitle;
    diag.keyword_count_body = gen.keywordCountInBody;

    var result = {
      ok: true,
      msg: dryRun ? 'dry-run 생성 성공' : (publish ? '후기 게시 완료' : '생성 성공(미게시)'),
      topic: topic,
      tone: tone,
      title: gen.title,
      body: gen.body,
      charCount: gen.charCount,
      elapsedMs: gen.elapsedMs,
      listingId: null,
      mode: plan.mode,
      mainKeyword: mainKeyword,
      subKeywords: plan.subKeywords || [],
      keywordInTitle: gen.keywordInTitle,
      keywordCountInBody: gen.keywordCountInBody,
      model: gen.model || Gemini.GEMINI_MODEL
    };

    if (publish && !dryRun) {
      await assertCanPublish(!!opts.skipDailyLimit);
    }

    if (dryRun) {
      await writeGenLog({
        ok: true,
        msg: result.msg,
        source: source,
        topic_id: topic.id,
        tone_id: tone.id,
        listing_id: null,
        char_count: gen.charCount,
        response_time_ms: gen.elapsedMs,
        diag: diag,
        started_at: startedAt,
        ended_at: nowIso(),
        duration_ms: Date.now() - startMs
      });
      return result;
    }

    if (publish) {
      var listingId = await getNextListingId();
      var insertRow = {
        listing_id: listingId,
        title: gen.title,
        body: gen.body,
        author: '퍼플오토 고객',
        views: Math.floor(Math.random() * 120) + 15,
        published_at: kstDateString(),
        sort_order: listingId,
        is_active: true,
        category: topic.category,
        topic_id: topic.id,
        is_ai_generated: true,
        generation_meta: {
          tone_id: tone.id,
          tone_name: tone.name,
          topic: topic.topic,
          title_sample: topic.titleSample,
          core_keywords: gen.coreKeywords || [],
          customer_type: gen.customerType || '',
          model: gen.model || Gemini.GEMINI_MODEL,
          generated_at: startedAt,
          source: source,
          review_mode: plan.mode,
          main_keyword: mainKeyword,
          sub_keywords: plan.subKeywords || [],
          keyword_in_title: gen.keywordInTitle,
          keyword_count_body: gen.keywordCountInBody
        }
      };
      await sbFetch('customer_reviews', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify([insertRow])
      });
      result.listingId = listingId;
      diag.listing_id = listingId;
    }

    await writeGenLog({
      ok: true,
      msg: result.msg,
      source: source,
      topic_id: topic.id,
      tone_id: tone.id,
      listing_id: result.listingId,
      char_count: gen.charCount,
      response_time_ms: gen.elapsedMs,
      diag: diag,
      started_at: startedAt,
      ended_at: nowIso(),
      duration_ms: Date.now() - startMs
    });

    if (opts.queueId) {
      await updateQueueItem(opts.queueId, {
        status: 'done',
        result_listing_id: result.listingId,
        processed_at: nowIso(),
        error_msg: ''
      });
    }

    return result;
  } catch (e) {
    var msg = e instanceof Error ? e.message : String(e);
    await writeGenLog({
      ok: false,
      msg: msg.slice(0, 500),
      source: source,
      topic_id: opts.topicId || null,
      tone_id: opts.toneId || null,
      listing_id: null,
      char_count: 0,
      response_time_ms: 0,
      diag: Object.assign({}, diag, { last_error: msg }),
      started_at: startedAt,
      ended_at: nowIso(),
      duration_ms: Date.now() - startMs
    });
    if (opts.queueId) {
      await updateQueueItem(opts.queueId, {
        status: 'failed',
        processed_at: nowIso(),
        error_msg: msg.slice(0, 500)
      });
    }
    return { ok: false, msg: msg };
  }
}

async function processQueue(limit) {
  var max = limit || 1;
  var rows = await sbFetch(
    'customer_review_gen_queue?status=eq.pending&order=created_at.asc&limit=' + max,
    { method: 'GET' }
  );
  if (!rows || !rows.length) {
    return { processed: 0, results: [], msg: '대기 중인 큐 없음' };
  }

  var results = [];
  for (var i = 0; i < rows.length; i++) {
    var q = rows[i];
    await updateQueueItem(q.id, { status: 'processing' });
    var r = await runOneGeneration({
      topicId: q.topic_id || null,
      toneId: q.tone_id || null,
      publish: q.publish !== false,
      dryRun: !!q.dry_run,
      queueId: q.id,
      source: 'queue'
    });
    results.push({ queueId: q.id, result: r });
  }
  return { processed: results.length, results: results, msg: 'queue processed' };
}

module.exports = {
  runOneGeneration: runOneGeneration,
  processQueue: processQueue,
  runAutoPublish: runAutoPublish,
  canAutoPublish: canAutoPublish,
  getTodayAiCount: getTodayAiCount,
  getDailyMax: getDailyMax,
  getLastAiPublishedAt: getLastAiPublishedAt,
  getRecentAiMeta: getRecentAiMeta,
  isBoostActive: isBoostActive,
  sbFetch: sbFetch
};
